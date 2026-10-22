# Repara DXF ASCII con valores que contienen saltos de línea (desalinean código/valor)
import sys
src, dst = sys.argv[1], sys.argv[2]
with open(src, 'rb') as f: data = f.read()
lines = data.split(b'\r\n') if b'\r\n' in data[:2000] else data.split(b'\n')
out = []; i = 0; fixes = 0; n = len(lines)
def isint(b):
    s = b.strip()
    return s.lstrip(b'-').isdigit() and len(s) <= 6
while i < n - 1:
    code, val = lines[i], lines[i+1]
    if not isint(code):
        # la línea pertenece al valor anterior: pegarla
        out[-1] = out[-1] + b' ' + code
        fixes += 1; i += 1; continue
    out.append(code); out.append(val); i += 2
with open(dst, 'wb') as f: f.write(b'\r\n'.join(out) + b'\r\n')
print('fixes', fixes)
