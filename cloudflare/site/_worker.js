// Optional Cloudflare Pages binding: CARTO_BASEMAPS_KEY (secret).
export default {
 async fetch(request,env){
  const url=new URL(request.url);
  if(url.pathname==='/api/atlas-config')return Response.json({carto:!!env.CARTO_BASEMAPS_KEY},{headers:{'Cache-Control':'no-store'}});
  const m=/^\/api\/atlas-tiles\/(\d{1,2})\/(\d{1,7})\/(\d{1,7})\.png$/.exec(url.pathname);
  if(m){
   if(request.method!=='GET')return new Response('Method not allowed',{status:405});
   const [,zs,xs,ys]=m,z=Number(zs),x=Number(xs),y=Number(ys);
   if(z<2||z>19||x>=2**z||y>=2**z||!env.CARTO_BASEMAPS_KEY)return new Response('Tile unavailable',{status:503});
   const u=new URL('https://basemaps.cartocdn.com/rastertiles/voyager/'+z+'/'+x+'/'+y+'.png');u.searchParams.set('key',env.CARTO_BASEMAPS_KEY);
   try{const r=await fetch(u);if(!r.ok||!r.headers.get('content-type')?.includes('image/'))return new Response('Tile unavailable',{status:502});
    return new Response(r.body,{headers:{'Content-Type':r.headers.get('content-type'),'Cache-Control':'public, max-age=3600'}});
   }catch{return new Response('Tile unavailable',{status:502});}
  }
  return env.ASSETS.fetch(request);
 }
};