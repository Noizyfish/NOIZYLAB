#!/usr/bin/env node

/**
 * DNS Configuration Management CLI
 * @module cli/dns
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { noizylabZoneConfig } from '../infra/dns/noizylab.dns.js';
import { validateZoneConfig } from '../infra/dns/validator.js';
import { normalizeZoneConfig } from '../infra/dns/normalizer.js';
import {
  toZoneFile,
  toHumanReadable,
  toProviderPayload,
} from '../infra/dns/serializers.js';
import { getProvider } from '../infra/dns/providers/index.js';
import type { ZoneConfig, ProviderHint } from '../infra/dns/types.js';

const program = new Command();

program
  .name('dns')
  .description('DNS Configuration Management Tool')
  .version('1.0.0');

/**
 * Validate command - Validate DNS configuration
 */
program
  .command('validate')
  .description('Validate DNS configuration')
  .option('-f, --file <path>', 'Configuration file path')
  .action(async (options) => {
    const config = await loadConfig(options.file);
    const spinner = ora('Validating configuration...').start();

    try {
      const result = validateZoneConfig(config);

      if (result.errors.length === 0 && result.warnings.length === 0) {
        spinner.succeed(chalk.green('✓ Configuration is valid!'));
      } else {
        spinner.stop();

        if (result.errors.length > 0) {
          console.log(chalk.red.bold('\n❌ Errors:\n'));
          for (const error of result.errors) {
            console.log(
              chalk.red(`  • ${error.message}`) +
                (error.record ? chalk.gray(` (${error.record.type} ${error.record.name})`) : '')
            );
          }
        }

        if (result.warnings.length > 0) {
          console.log(chalk.yellow.bold('\n⚠️  Warnings:\n'));
          for (const warning of result.warnings) {
            console.log(
              chalk.yellow(`  • ${warning.message}`) +
                (warning.record
                  ? chalk.gray(` (${warning.record.type} ${warning.record.name})`)
                  : '')
            );
          }
        }

        if (!result.valid) {
          console.log(chalk.red('\n❌ Configuration has errors!\n'));
          process.exit(1);
        } else {
          console.log(chalk.green('\n✓ Configuration is valid (with warnings)\n'));
        }
      }
    } catch (error) {
      spinner.fail(chalk.red('Validation failed'));
      console.error(chalk.red(`\n${error instanceof Error ? error.message : String(error)}\n`));
      process.exit(1);
    }
  });

/**
 * Show command - Display configuration in human-readable format
 */
program
  .command('show')
  .description('Display DNS configuration in human-readable format')
  .option('-f, --file <path>', 'Configuration file path')
  .action(async (options) => {
    try {
      const config = await loadConfig(options.file);
      const normalized = normalizeZoneConfig(config);
      console.log(toHumanReadable(normalized));
    } catch (error) {
      console.error(
        chalk.red(`Error: ${error instanceof Error ? error.message : String(error)}`)
      );
      process.exit(1);
    }
  });

/**
 * Export command - Export configuration to zone file
 */
program
  .command('export')
  .description('Export configuration to BIND zone file format')
  .option('-f, --file <path>', 'Configuration file path')
  .option('-o, --output <path>', 'Output file path (stdout if not specified)')
  .action(async (options) => {
    try {
      const config = await loadConfig(options.file);
      const normalized = normalizeZoneConfig(config);
      const zoneFile = toZoneFile(normalized);

      if (options.output) {
        const { writeFileSync } = await import('fs');
        writeFileSync(options.output, zoneFile);
        console.log(chalk.green(`✓ Zone file exported to ${options.output}`));
      } else {
        console.log(zoneFile);
      }
    } catch (error) {
      console.error(
        chalk.red(`Error: ${error instanceof Error ? error.message : String(error)}`)
      );
      process.exit(1);
    }
  });

/**
 * Diff command - Show differences between local config and live DNS
 */
program
  .command('diff <provider>')
  .description('Show differences between local config and live DNS')
  .option('-f, --file <path>', 'Configuration file path')
  .action(async (providerName: string, options) => {
    const spinner = ora('Comparing configurations...').start();

    try {
      const config = await loadConfig(options.file);
      const normalized = normalizeZoneConfig(config);
      const provider = getProvider(providerName);

      await provider.authenticate();
      const dryRunResult = await provider.dryRun(normalized);

      spinner.stop();

      if (
        dryRunResult.toCreate.length === 0 &&
        dryRunResult.toUpdate.length === 0 &&
        dryRunResult.toDelete.length === 0
      ) {
        console.log(chalk.green('\n✓ No differences found. DNS is in sync!\n'));
        return;
      }

      console.log(chalk.bold('\n📋 Differences:\n'));

      if (dryRunResult.toCreate.length > 0) {
        console.log(chalk.green.bold(`\n➕ Records to CREATE (${dryRunResult.toCreate.length}):\n`));
        for (const record of dryRunResult.toCreate) {
          console.log(chalk.green(`  + ${record.type.padEnd(6)} ${record.name}`));
        }
      }

      if (dryRunResult.toUpdate.length > 0) {
        console.log(chalk.yellow.bold(`\n🔄 Records to UPDATE (${dryRunResult.toUpdate.length}):\n`));
        for (const record of dryRunResult.toUpdate) {
          console.log(chalk.yellow(`  ~ ${record.type.padEnd(6)} ${record.name}`));
        }
      }

      if (dryRunResult.toDelete.length > 0) {
        console.log(chalk.red.bold(`\n➖ Records to DELETE (${dryRunResult.toDelete.length}):\n`));
        for (const record of dryRunResult.toDelete) {
          console.log(chalk.red(`  - ${record.type.padEnd(6)} ${record.name}`));
        }
      }

      console.log('');
    } catch (error) {
      spinner.fail(chalk.red('Failed to compare configurations'));
      console.error(chalk.red(`\n${error instanceof Error ? error.message : String(error)}\n`));
      process.exit(1);
    }
  });

/**
 * Apply command - Apply configuration to provider
 */
program
  .command('apply <provider>')
  .description('Apply DNS configuration to provider')
  .option('-f, --file <path>', 'Configuration file path')
  .option('--dry-run', 'Show what would be done without making changes')
  .option('--delete-unmanaged', 'Delete records not in configuration')
  .option('--verbose', 'Verbose output')
  .action(async (providerName: string, options) => {
    try {
      const config = await loadConfig(options.file);
      const normalized = normalizeZoneConfig(config);

      // Validate first
      const validationSpinner = ora('Validating configuration...').start();
      const validationResult = validateZoneConfig(normalized);

      if (!validationResult.valid) {
        validationSpinner.fail(chalk.red('Configuration has errors'));
        console.log(chalk.red.bold('\n❌ Errors:\n'));
        for (const error of validationResult.errors) {
          console.log(
            chalk.red(`  • ${error.message}`) +
              (error.record ? chalk.gray(` (${error.record.type} ${error.record.name})`) : '')
          );
        }
        process.exit(1);
      }

      validationSpinner.succeed(chalk.green('Configuration is valid'));

      // Apply changes
      const provider = getProvider(providerName);
      const authSpinner = ora('Authenticating with provider...').start();
      await provider.authenticate();
      authSpinner.succeed(chalk.green('Authenticated'));

      const applySpinner = ora(
        options.dryRun ? 'Running dry-run...' : 'Applying configuration...'
      ).start();

      const result = await provider.applyConfig(normalized, {
        dryRun: options.dryRun,
        deleteUnmanaged: options.deleteUnmanaged,
        verbose: options.verbose,
      });

      applySpinner.stop();

      if (options.dryRun) {
        console.log(chalk.bold('\n🔍 Dry Run Results:\n'));
      } else {
        console.log(chalk.bold('\n✅ Apply Results:\n'));
      }

      console.log(chalk.green(`  Created:  ${result.created.length} records`));
      console.log(chalk.yellow(`  Updated:  ${result.updated.length} records`));
      console.log(chalk.red(`  Deleted:  ${result.deleted.length} records`));

      if (result.errors.length > 0) {
        console.log(chalk.red.bold('\n❌ Errors:\n'));
        for (const error of result.errors) {
          console.log(chalk.red(`  • ${error}`));
        }
      }

      if (options.verbose) {
        if (result.created.length > 0) {
          console.log(chalk.green.bold('\n➕ Created:\n'));
          for (const record of result.created) {
            console.log(chalk.green(`  + ${record.type.padEnd(6)} ${record.name}`));
          }
        }

        if (result.updated.length > 0) {
          console.log(chalk.yellow.bold('\n🔄 Updated:\n'));
          for (const record of result.updated) {
            console.log(chalk.yellow(`  ~ ${record.type.padEnd(6)} ${record.name}`));
          }
        }

        if (result.deleted.length > 0) {
          console.log(chalk.red.bold('\n➖ Deleted:\n'));
          for (const record of result.deleted) {
            console.log(chalk.red(`  - ${record.type.padEnd(6)} ${record.name}`));
          }
        }
      }

      console.log('');

      if (!options.dryRun && result.errors.length === 0) {
        console.log(chalk.green.bold('✓ Configuration applied successfully!\n'));
      }
    } catch (error) {
      console.error(
        chalk.red(`\nError: ${error instanceof Error ? error.message : String(error)}\n`)
      );
      process.exit(1);
    }
  });

/**
 * Load configuration from file or use default
 */
async function loadConfig(filePath?: string): Promise<ZoneConfig> {
  if (filePath) {
    const absolutePath = resolve(process.cwd(), filePath);
    try {
      const module = await import(absolutePath);
      return module.default || module.config || module.noizylabZoneConfig;
    } catch (error) {
      throw new Error(
        `Failed to load configuration from ${filePath}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  // Use default configuration
  return noizylabZoneConfig;
}

program.parse();
