import trimesh, numpy as np, manifold3d as mf, json, gzip, base64, io
from fontTools.ttLib import TTFont
sc=trimesh.load('/mnt/user-data/attachments/d408f13a-0dea-5d03-aa85-031957260481/cd51f0e6-Clicky_Snack_Counter.3mf')
order=['Body1','Body2','Body3','Body4','Body5','Body6','Body7','Body8']
names={'Body1':'Dial L','Body2':'Dial R','Body3':'Front plate A','Body4':'Spring A','Body5':'Back plate B','Body6':'Spring B','Body7':'Back plate A','Body8':'Front plate B'}
out=[]; zones={}
for n in order:
    m=sc.geometry[n]
    if n in ('Body3','Body8'):
        v=m.vertices; t=v[v[:,2]<-2.01]; c=m.bounds.mean(0)
        up=t[t[:,1]>c[1]]; lo=t[t[:,1]<c[1]]
        zones[n]=dict(cx=float(c[0]),cy=float(c[1]),
          up=dict(y=float((up[:,1].min()+up[:,1].max())/2), h=float(up[:,1].ptp()) if hasattr(up[:,1],'ptp') else float(np.ptp(up[:,1]))),
          lo=dict(y=float((lo[:,1].min()+lo[:,1].max())/2), h=float(np.ptp(lo[:,1]))))
        M=mf.Manifold(mf.Mesh(vert_properties=np.asarray(m.vertices,np.float32),tri_verts=np.asarray(m.faces,np.uint32)))
        box=mf.Manifold.cube([400,400,100]).translate([-200+c[0],-200+c[1],-2.0])
        r=(M^box).to_mesh(); m=trimesh.Trimesh(r.vert_properties[:,:3],r.tri_verts)
        print(n,'stripped',m.is_watertight,m.bounds.round(2).tolist(),round(m.volume/1000,3))
    out.append((n,names[n],np.asarray(m.vertices,np.float32),np.asarray(m.faces,np.uint32)))
print(json.dumps(zones,indent=1))
# pack binary
buf=io.BytesIO(); meta=[]
for n,label,v,f in out:
    meta.append(dict(id=n,name=label,nv=len(v),nf=len(f))); buf.write(v.tobytes()); buf.write(f.tobytes())
blob=base64.b64encode(gzip.compress(buf.getvalue(),9)).decode()
print('mesh blob KB',len(blob)//1024)
# preview outline of front plate A bottom face, in plate-local coords, unmirrored (viewer looks at the bed face)
m=sc.geometry['Body3']; c=m.bounds.mean(0)
sec=m.section([0,0,1],[0,0,-1.95]); P,T=sec.to_2D(np.eye(4))
loops=[[[round(-(x-c[0]),2),round(y-c[1],2)] for x,y in e] for e in P.discrete]
# fonts subset
fonts={}
for key,fn in [('bebas','BebasNeue-Regular.ttf'),('anton','Anton-Regular.ttf'),('bangers','Bangers-Regular.ttf')]:
    from fontTools import subset
    f=TTFont(fn); opts=subset.Options(); opts.layout_features=['kern']; opts.notdef_outline=True
    s=subset.Subsetter(opts); s.populate(unicodes=list(range(0x20,0x7f))+list(range(0xa0,0x180))); s.subset(f)
    b=io.BytesIO(); f.save(b); fonts[key]=base64.b64encode(b.getvalue()).decode(); print(key,len(fonts[key])//1024,'KB')
json.dump(dict(meta=meta,zones=zones,outline=loops),open('meta.json','w'))
open('mesh.b64','w').write(blob); json.dump(fonts,open('fonts.json','w'))
