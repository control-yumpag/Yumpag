import struct, re, collections, json, sys
SEGN=(b'segidx',b'datidx',b'_data_',b'schidx',b'schdat',b'search',b'blob01',b'prvsav',b'freesp')
def leer(path):
    d=open(path,'rb').read()
    segs={}
    for m in re.finditer(b'\xac\xd5', d):
        nm=d[m.start()+2:m.start()+8]
        if nm in SEGN:
            h=struct.unpack_from('<iiiiiiii', d, m.start()+8)
            segs[h[0]]=(m.start(), nm.decode(), h)
    o,_,h=[v for v in segs.values() if v[1]=='datidx'][0]
    cnt,_=struct.unpack_from('<ii', d, o+48)
    dat=[struct.unpack_from('<iii', d, o+56+12*i) for i in range(cnt)]
    return d, segs, dat
def tabla(d, o):
    ents=[]; p=o+48
    while True:
        sz,u,hd,lo=struct.unpack_from('<iiqi', d, p)
        if sz!=20 or u!=1: break
        ents.append((hd,lo)); p+=20
    base=p
    while d[base]==0x62: base+=1
    return ents, base
def blob01(d, segs, k):
    """Devuelve los datos de un blob01 que empieza en el segmento k (y continúa en los siguientes)."""
    o,n,h=segs[k]
    # cabecera blob01: Int64 total, Int64 page start, Int32 page idx, Int32 page count, Int64 page size
    tot,pstart,pidx,pcnt,psz=struct.unpack_from('<qqiiq', d, o+48)
    return tot,pstart,pidx,pcnt,psz
def registros(path, schema=5):
    d,segs,dat=leer(path)
    cache={}
    out=[]
    for (sg,lo,sc) in dat:
        if sc!=schema or sg not in segs: continue
        o,n,h=segs[sg]
        if sg not in cache: cache[sg]=tabla(d,o)
        ents,base=cache[sg]
        hd,dlo=ents[lo//20]
        p=base+dlo
        ln=struct.unpack_from('<I', d, p)[0]
        out.append((hd, p+4, ln))
    return d, segs, out
if __name__=='__main__':
    d,segs,out=registros(sys.argv[1])
    c=collections.Counter()
    for hd,p,ln in out:
        c[d[p:p+15]]+=1
    print(len(out), c.most_common(5))
    for hd,p,ln in out:
        if d[p:p+15]!=b'ASM BinaryFile4':
            print(hd,p,ln,' '.join(f'{x:02x}' for x in d[p:p+48])); break

def sabs(path, schema=5):
    """[(handle, bytes SAB)] para todos los sólidos."""
    d,segs,out=registros(path, schema)
    res=[]
    for hd,p,ln in out:
        if d[p:p+15]==b'ASM BinaryFile4':
            res.append((hd, d[p:p+ln]))
        else:
            q=p-4
            mk,tot,pc,hs=struct.unpack_from('<IqII', d, q)
            seg=struct.unpack_from('<I', d, q+36)[0]
            if seg in segs:
                o=segs[seg][0]
                t2=struct.unpack_from('<q', d, o+48)[0]
                res.append((hd, d[o+80:o+80+t2]))
            else:
                res.append((hd, None))
    return res
