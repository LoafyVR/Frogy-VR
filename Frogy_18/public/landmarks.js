'use strict';
/* FROGY: three deliberately different environment identities, built as batched
   triangle meshes rather than hundreds of scene draw calls. Purely original assets. */
const FrogyLandmarks=(()=>{
 const cache=[null,null,null], TAU=Math.PI*2;
 const COLORS=[
  [ // flooded swamp: murky water / splintered docks / wet roots
   [.017,.082,.090],[.045,.074,.061],[.19,.14,.095],[.10,.092,.080],
   [.08,.18,.12],[.17,.23,.14],[.63,.48,.18],[.013,.034,.038],[.07,.12,.085]
  ],
  [ // cemetery: violet midnight stone / mausoleums / black iron
   [.18,.17,.20],[.31,.29,.34],[.11,.10,.15],[.12,.11,.13],
   [.08,.09,.12],[.47,.35,.18],[.19,.21,.35],[.055,.045,.068],[.22,.20,.23]
  ],
  [ // abandoned industrial research plant: concrete / rust / warnings
   [.12,.14,.15],[.23,.12,.10],[.51,.37,.095],[.26,.33,.32],
   [.10,.31,.29],[.065,.075,.084],[.54,.077,.073],[.13,.15,.16],[.28,.30,.27]
  ]
 ];
 function build(t){
  const groups=COLORS[t].map(()=>({v:[],n:[],idx:[]}));
  const add=(i,a,b,c)=>{
   const g=groups[i],off=g.v.length/3;
   if(off>=65000)return;
   g.v.push(...a,...b,...c);
   const u=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],v=[c[0]-a[0],c[1]-a[1],c[2]-a[2]],q=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
   const n=Math.hypot(...q)||1;q.forEach((x,j)=>q[j]=x/n);
   for(let j=0;j<3;j++)g.n.push(...q);
   g.idx.push(off,off+1,off+2);
  };
  const quad=(i,a,b,c,d)=>{add(i,a,b,c);add(i,a,c,d);};
  function box(i,x,y,z,hx,hy,hz){
   const a=[x-hx,y-hy,z-hz],b=[x+hx,y-hy,z-hz],c=[x+hx,y+hy,z-hz],d=[x-hx,y+hy,z-hz],e=[x-hx,y-hy,z+hz],f=[x+hx,y-hy,z+hz],g=[x+hx,y+hy,z+hz],h=[x-hx,y+hy,z+hz];
   quad(i,a,b,c,d);quad(i,f,e,h,g);quad(i,e,a,d,h);quad(i,b,f,g,c);quad(i,d,c,g,h);quad(i,e,f,b,a);
  }
  function disc(i,x,z,rx,rz,y,segments=28){
   for(let j=0;j<segments;j++){const a=TAU*j/segments,b=TAU*(j+1)/segments;add(i,[x,y,z],[x+Math.cos(a)*rx,y,z+Math.sin(a)*rz],[x+Math.cos(b)*rx,y,z+Math.sin(b)*rz]);}
  }
  function beam(i,a,b,r){
   const mid=a.map((v,k)=>(v+b[k])/2),len=Math.hypot(...a.map((v,k)=>v-b[k]));
   // Vertical branch/tree shape: keep axis-aligned, sufficiently thin to suggest broken supports.
   box(i,mid[0],mid[1],mid[2],r,len/2,r);
  }
  function cross(i,x,y,z,scale){box(i,x,y,z,.095*scale,.60*scale,.09*scale);box(i,x,y+.17*scale,z,.36*scale,.10*scale,.10*scale);}
  if(t===0){
   // Irregular channels: the swamp is WATER rather than a flat grassy field.
   const pools=[[-25,-12,17,12],[14,14,15,10],[-40,30,15,9],[35,-27,14,18],[-5,40,13,9],[39,6,10,13],[-42,-39,10,10],[3,-39,11,9]];
   for(const [x,z,rx,rz] of pools){disc(1,x,z,rx+1.0,rz+1.0,.025);disc(0,x,z,rx,rz,.041);for(let i=0;i<3;i++){const xx=x+(i-1)*rx*.33,zz=z+Math.sin(i*5)*rz*.34;disc(8,xx,zz,rx*.25,rz*.085,.044,12);}}
   // Entire plank walkway, with broken ends and repeated pilings. Transverse boards are recognizably wood.
   const paths=[[[-42,-5],[-13,-2]],[[17,16],[35,17]],[[-3,42],[4,25]]];
   for(const [[ax,az],[bx,bz]] of paths){const dx=bx-ax,dz=bz-az,len=Math.hypot(dx,dz),steps=Math.floor(len/.85),ux=dx/len,uz=dz/len;
    for(let j=0;j<steps;j++){const x=ax+(j+.5)*len/steps*ux,z=az+(j+.5)*len/steps*uz;if(j%13===10)continue;
     box(j%6===0?3:2,x,.28,z,Math.abs(uz)*1.12+Math.abs(ux)*.37,.085,Math.abs(ux)*1.12+Math.abs(uz)*.37);
     if(j%5===0){box(3,x+uz*.98,.17,z-ux*.98,.12,.40,.12);box(3,x-uz*.98,.17,z+ux*.98,.12,.40,.12);}
    }
   }
   // Two abandoned wooden hunting towers and a collapsing high footbridge.
   for(const [x,z] of [[-44,7],[37,37]]){
    for(const sx of [-1,1])for(const sz of [-1,1])box(3,x+sx*1.7,2.1,z+sz*1.7,.19,2.1,.19);
    box(2,x,4.4,z,2.45,.23,2.3);box(3,x,6.35,z,2.45,.14,2.35);
    for(const sx of [-1,1])box(3,x+sx*2.26,5.35,z,.11,.79,2.05);
    box(3,x,5.35,z+2.20,2.16,.79,.10);
    box(7,x,5.15,z-2.20,1.0,.95,.05);
    for(let j=0;j<10;j++)box(2,x-1.7+j*.38,1.0+j*.29,z-2.2,.18,.06,.20);
   }
   // Reeds and stumps around broad channels.
   for(let i=0;i<190;i++){const a=i*2.39996,r=10+(i%17)*2.8,x=Math.sin(a)*r,z=Math.cos(a)*r;box(5,x,.65,z,.045,.65,.045);if(i%3===0)box(4,x,.26,z,.24,.25,.23);}
  }else if(t===1){
   // Cross-shaped cobbled paths and an old funeral procession route.
   for(let i=-54;i<=54;i+=2.3){for(let j=-2;j<=2;j++){const c=(Math.abs(i+j)%4)<2?0:8;box(c,i,.042,j*.95,1.12,.033,.44);box(c,j*.95,.040,i,.44,.033,1.12);}}
   // Dense regimented tombstones strongly contrast with organic swamp foliage.
   for(const side of [-1,1])for(let row=0;row<8;row++)for(let col=0;col<9;col++){
    const x=side*(10.0+row*5.5),z=-42+col*10.4+((row%2)*2.8);
    if(Math.hypot(x,z)>61)continue;
    const scale=.76+((row*7+col*3)%5)*.12;
    box((row+col)%3===0?1:0,x,.52*scale,z,.42*scale,.56*scale,.24*scale);
    if((row+col)%4===0)cross(1,x,1.3*scale,z,.72*scale);
    box(3,x,.028,z+.35*scale,.80,.04,.65);
    if((row+col)%7===0)box(5,x+.54,.19,z+.45,.095,.19,.095);
   }
   // Castle-like boundary wall with arch, iron gate and sentry turrets.
   for(let i=-11;i<=11;i++){
    if(Math.abs(i)<2)continue;
    box(2,i*5.15,1.1,59,2.45,1.12,.32);
    if(i%2===0)box(1,i*5.15,2.31,59,2.33,.21,.43);
   }
   for(const x of [-10,10]){
    box(1,x,2.4,59,1.45,2.4,1.55);box(2,x,5.25,59,1.8,.55,1.78);
    for(const sx of [-1,1])box(1,x+sx*.9,5.8,59,.24,.31,.3);
   }
   for(let j=-4;j<=4;j++)box(4,j*1.28,1.52,59,.065,1.55,.11);
   box(1,0,3.7,59,5.45,.26,.8);
   // Huge broken bell frame near the gothic chapel.
   for(const x of [-6.4,6.4])box(2,x,5.2,-27,.54,5.2,.54);
   box(2,0,10.4,-27,7.3,.43,.7);box(5,0,7.5,-27,1.5,1.4,1.5);
  }else{
   // Facility has tiled CONCRETE and enormous metal walls rather than outdoor grass.
   box(0,0,.032,0,51,.043,51);
   for(let i=-48;i<=48;i+=4){box(7,i,.082,0,.045,.02,50);box(7,0,.080,i,50,.02,.045);}
   // Painted hazard lanes and intersecting vehicle tracks.
   for(let j=-46;j<=46;j+=3.2){for(const x of [-32,32])box(2,x,.087,j,1.0,.018,.38);}
   for(const z of [-34,34])for(let j=-44;j<=44;j+=4.2)box(2,j,.083,z,.54,.02,.75);
   // Three industrial hangars with enormous rolling doors, catwalks and broken beams.
   for(const [x,z,hx,hz] of [[-34,-35,12,10],[36,-32,13,11],[-35,32,12,11]]){
    for(const sx of [-1,1]){box(5,x+sx*hx,3.45,z,.50,3.45,hz);box(8,x+sx*hx,6.5,z,.8,.23,hz+1.2);}
    for(const sz of [-1,1]){box(5,x,3.15,z+sz*hz,hx,.52,.55);box(0,x,6.55,z+sz*hz,hx,.30,.65);}
    box(5,x,7.2,z,hx+1,.40,hz+1.0);
    // Visible doorway panel and transverse girders.
    box(4,x,2.75,z-hz-.65,hx*.35,2.70,.10);
    for(let j=-2;j<=2;j++)box(3,x+j*4,6.0,z,.12,.70,hz+.5);
    for(let j=-4;j<=4;j++)box(1,x+j*2.5,.085,z-hz+1.0,.08,.025,1.12);
   }
   // Experimental reactor hazard stripes and electric warning glow.
   for(let j=0;j<12;j++){const a=TAU*j/12,x=26+Math.sin(a)*8,z=25+Math.cos(a)*8;
    box(j%2===0?2:6,x,.084,z,.86,.025,1.1);
    box(3,x,.35,z,.13,.35,.13);
   }
   // Pipes and ceiling gantries running over long corridors.
   for(let j=-3;j<=3;j++){
    const x=j*11.5;box(3,x,6.2,0,.19,.17,47);
    for(const z of [-43,-22,0,22,43]){
     box(3,x,3.3,z,.12,2.9,.12);box(4,x,5.95,z,.58,.07,.68);
    }
   }
   for(let i=0;i<26;i++){
    const x=-52+(i%13)*8.7,z=i<13?-57:57;
    box(6,x,2.8,z,.55,.07,.22);box(1,x,1.8,z,.12,1,.12);
   }
  }
  return groups.map((g,i)=>g.idx.length?{geometry:mesh(g.v,g.n,g.idx),color:COLORS[t][i]}:null).filter(Boolean);
 }
 function drawLandmarks(t){if(!cache[t])cache[t]=build(t);for(const part of cache[t])draw(part.geometry,mat(0,0,0,1,1,1),part.color);}
 return {draw:drawLandmarks};
})();
