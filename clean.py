import re

with open('src/index.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

clean = re.sub(r'process\.exit\(0\);.*$', 'process.exit(0);', content)

with open('src/index.tsx', 'w', encoding='utf-8') as f:
    f.write(clean)

print('Done. Last 80 chars:', repr(clean[-80:]))