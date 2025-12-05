#!/bin/bash
# NOIZYLAB Export to Excel Script

echo "=========================================="
echo "NOIZYLAB EXPORT TO EXCEL"
echo "=========================================="

OUTPUT_DIR="exports"
mkdir -p "$OUTPUT_DIR"
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')

# Export improvements database to CSV (Excel-compatible)
DB_FILE="/Users/m2ultra/NOIZYLAB/data/upgrade_improve.db"
if [ -f "$DB_FILE" ]; then
    echo "Exporting improvements database..."
    sqlite3 -header -csv "$DB_FILE" "SELECT * FROM improvements ORDER BY date_added DESC;" > "$OUTPUT_DIR/improvements_$TIMESTAMP.csv"
    echo "  Created: $OUTPUT_DIR/improvements_$TIMESTAMP.csv"
fi

# Export MS365 admin database
MS365_DB="/Users/m2ultra/NOIZYLAB/data/ms365_admin.db"
if [ -f "$MS365_DB" ]; then
    echo "Exporting MS365 admin data..."
    sqlite3 -header -csv "$MS365_DB" "SELECT * FROM admin_tasks;" > "$OUTPUT_DIR/admin_tasks_$TIMESTAMP.csv"
    sqlite3 -header -csv "$MS365_DB" "SELECT * FROM ai_addons;" > "$OUTPUT_DIR/ai_addons_$TIMESTAMP.csv"
    sqlite3 -header -csv "$MS365_DB" "SELECT * FROM dns_records;" > "$OUTPUT_DIR/dns_records_$TIMESTAMP.csv"
    echo "  Created: admin_tasks, ai_addons, dns_records CSVs"
fi

# Export emails database
EMAILS_DB="/Users/m2ultra/NOIZYLAB/data/emails.db"
if [ -f "$EMAILS_DB" ]; then
    echo "Exporting emails database..."
    sqlite3 -header -csv "$EMAILS_DB" "SELECT * FROM emails ORDER BY date_fetched DESC;" > "$OUTPUT_DIR/emails_$TIMESTAMP.csv"
    echo "  Created: $OUTPUT_DIR/emails_$TIMESTAMP.csv"
fi

# Create summary
echo ""
echo "Export complete!"
echo "Files in $OUTPUT_DIR/:"
ls -la "$OUTPUT_DIR/"*.csv 2>/dev/null || echo "No exports yet"

echo ""
echo "Open in Excel: open $OUTPUT_DIR/"
