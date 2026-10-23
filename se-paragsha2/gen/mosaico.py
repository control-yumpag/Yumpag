# Mosaico georreferenciado de capturas de Google Maps (satélite) a z19, DPR 1,25 → mosaico_z19.jpg (+ .json).
# Las capturas (blob-*.jpg) no se publican (condiciones de Google Maps); la lista de centros está en satelite_param.json.
import math, json
from PIL import Image
Z=19; DPR=1.25
def merc(lat, lon, z=Z):
    n=256*2**z; x=(lon+180)/360*n
    s=math.sin(math.radians(lat)); y=(0.5-math.log((1+s)/(1-s))/(4*math.pi))*n
    return x, y
def inv(x, y, z=Z):
    n=256*2**z; lon=x/n*360-180
    lat=math.degrees(math.atan(math.sinh(math.pi*(1-2*y/n)))); return lat, lon
T=[('ijr83c',-10.671812,-76.278386,1.0),('2pdzbw',-10.671796,-76.278571,1.0),('n9eb2o',-10.671796,-76.277474,1.0),('p0ycuc',-10.671796,-76.276377,1.0),
   ('usrvq2',-10.673062,-76.278571,1.0),('h0rnvu',-10.673062,-76.277474,1.0),('mx6apq',-10.673062,-76.276377,1.0),('53sgmo',-10.674327,-76.277474,0.8)]
import glob
info=[]
for k,lat,lon,sc in T:
    f=glob.glob(f'*-{k}.jpg')[0]; im=Image.open(f).convert('RGB')
    if sc!=1.0: im=im.resize((round(im.width/sc), round(im.height/sc)), Image.LANCZOS)
    cx,cy=merc(lat,lon)  # px CSS globales
    # esquina sup-izq en px de pantalla globales (CSS*DPR)
    W,H=im.size
    x0=cx*DPR - W/2; y0=cy*DPR - H/2
    info.append((im,x0,y0))
X0=min(i[1] for i in info); Y0=min(i[2] for i in info); X1=max(i[1]+i[0].width for i in info); Y1=max(i[2]+i[0].height for i in info)
M=Image.new('RGB',(math.ceil(X1-X0), math.ceil(Y1-Y0)),(0,0,0))
# orden: los de mayor detalle al final (todos iguales); se pega recortando 40 px de borde para evitar etiquetas del canvas en los bordes
for im,x0,y0 in info:
    M.paste(im,(round(x0-X0),round(y0-Y0)))
M.save('mosaico_z19.jpg', quality=90)
meta={'z':Z,'dpr':DPR,'X0':X0,'Y0':Y0,'W':M.width,'H':M.height,'m_px': 156543.03392*math.cos(math.radians(-10.6727))/2**Z/DPR}
json.dump(meta,open('mosaico_z19.json','w'),indent=1); print(meta)
