
---

## HARD RULE #24 - JUMBO FRAMES (GOD LIKE)
**MTU 9000 = DEFAULT SETTING FOREVER**

- All network interfaces: MTU 9000
- 15-20% performance boost
- 1 Gbps throughput
- NEVER use MTU 1500
- This is GOD LIKE performance
- LOCKED FOREVER

**Enable command:**
```bash
sudo ifconfig en0 mtu 9000
```

**Verify:**
```bash
ifconfig en0 | grep mtu
```

**Expected output:**
```
en0: ... mtu 9000
```

---
