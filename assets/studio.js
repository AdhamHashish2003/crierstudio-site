/* Local Crier design study. Existing Three.js r128, local logo + fonts, no external requests. */
(async function () {
  'use strict';
  const stage=document.getElementById('spatial-stage'),canvas=document.getElementById('spatial-canvas');
  const motion=document.getElementById('motion'),reset=document.getElementById('reset-view');
  const tabs=[...document.querySelectorAll('[data-scene]')];
  if(!stage||!canvas)return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const palette={lime:'#C6FF00',ink:'#0E0F0C',cream:'#F6F8EF',surface:'#E9EEDA',line:'#CDD3BC',dark:'#171913'};
  let renderer,raf=0,visible=true,paused=reduced.matches,destroyed=false,frameCount=0;
  function fallback(){stage.dataset.state='fallback';motion.disabled=true;reset.disabled=true;tabs.forEach(b=>b.disabled=true);document.querySelector('.drag-hint').textContent=stage.dataset.static;cancelAnimationFrame(raf);raf=0;}
  try{
    if(!window.THREE){fallback();return;}
    stage.dataset.state='loading';
    const T=window.THREE;
    renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'low-power'});
    renderer.outputEncoding=T.sRGBEncoding;
    renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
    renderer.setClearColor(palette.ink,1);
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
    const scene=new T.Scene();
    const camera=new T.PerspectiveCamera(33,1,.1,50);
    camera.position.set(0,1.1,12.1);camera.lookAt(0,-.1,0);
    const color=hex=>new T.Color(hex).convertSRGBToLinear();
    function material(hex,rough=.5,metal=0){return new T.MeshStandardMaterial({color:color(hex),roughness:rough,metalness:metal,envMapIntensity:.16});}
    const envScene=new T.Scene();envScene.background=color(palette.ink);
    for(const [x,y,z,w,h,power] of [[-5,4,3,3,8,4],[4,5,0,5,3,3],[1,2,-5,4,6,2]]){
      const softbox=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({color:color(palette.cream).multiplyScalar(power),side:T.DoubleSide}));
      softbox.position.set(x,y,z);softbox.lookAt(0,0,0);envScene.add(softbox);
    }
    const pm=new T.PMREMGenerator(renderer);const environment=pm.fromScene(envScene,.04);scene.environment=environment.texture;pm.dispose();
    scene.add(new T.HemisphereLight(color(palette.cream),color(palette.ink),.55));
    const key=new T.DirectionalLight(color(palette.cream),.65);key.position.set(-3.5,6,6);key.castShadow=true;
    key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-6;key.shadow.camera.right=6;key.shadow.camera.top=6;key.shadow.camera.bottom=-6;key.shadow.normalBias=.035;key.shadow.bias=-.0003;key.shadow.radius=4;scene.add(key);
    const rim=new T.DirectionalLight(color(palette.cream),.45);rim.position.set(4,2,-2);scene.add(rim);
    const fill=new T.DirectionalLight(color(palette.cream),.12);fill.position.set(1,0,5);scene.add(fill);
    const floor=new T.Mesh(new T.CircleGeometry(3.3,96),material(palette.ink,.85));floor.rotation.x=-Math.PI/2;floor.position.y=-2.1;floor.material.envMapIntensity=0;floor.receiveShadow=true;scene.add(floor);
    const group=new T.Group();scene.add(group);
    const loadImg=url=>new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=url;});
    const [logoDark,logoLight]=await Promise.all([loadImg('/assets/logo.svg'),loadImg('/assets/logo-light.svg'),document.fonts.load('600 96px Archivo'),document.fonts.load('400 24px Instrument Sans Sans')]);
    function texture(w,h,paint){const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');paint(x,w,h);const t=new T.CanvasTexture(c);t.encoding=T.sRGBEncoding;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());return t;}
    function bookCover(x,w,h){x.fillStyle=palette.cream;x.fillRect(0,0,w,h);x.drawImage(logoDark,75,74,350,84);x.fillStyle=palette.ink;x.font='400 20px Instrument Sans Sans';x.fillText('THE STUDIO PERSPECTIVE',75,260);x.font='600 114px Archivo';x.fillText('Brands',66,505);x.fillText('with',66,620);x.fillText('character.',66,735);x.fillStyle=palette.lime;x.fillRect(75,830,w-150,250);x.fillStyle=palette.ink;x.font='600 42px Archivo';x.fillText('A point of view.',100,918);x.font='400 25px Instrument Sans Sans';x.fillText('A whole world of expression.',100,976);x.fillStyle=palette.ink;x.font='400 22px Instrument Sans Sans';x.fillText('IDENTITY / DIGITAL / PHYSICAL',75,h-110);x.font='400 17px Instrument Sans Sans';x.fillText('SELF-INITIATED STUDIO CONCEPT',75,h-60);}
    const coverTexture=texture(1000,1400,bookCover);
    const book=new T.Group();group.add(book);
    const edge=material(palette.cream,.95),cover=material(palette.ink,.7),coverFront=new T.MeshStandardMaterial({map:coverTexture,roughness:.6,metalness:0,envMapIntensity:.1});
    const bookBody=new T.Mesh(new T.BoxGeometry(2.3,3.22,.17),[cover,cover,edge,edge,coverFront,cover]);bookBody.castShadow=true;book.add(bookBody);
    for(let i=0;i<5;i++){const pageEdge=new T.Mesh(new T.BoxGeometry(2.27,.008,.008),material(palette.line,.9));pageEdge.position.set(0,-1.596,-.045+i*.022);book.add(pageEdge);}
    const screenTexture=texture(900,1200,(x,w,h)=>{x.fillStyle=palette.ink;x.fillRect(0,0,w,h);x.drawImage(logoLight,65,55,265,64);x.fillStyle=palette.cream;x.font='400 16px Instrument Sans Sans';x.fillText('WORK    STUDIO    CONTACT',520,95);x.fillStyle=palette.lime;x.font='600 119px Archivo';x.fillText('Think',55,325);x.fillText('in',55,442);x.fillText('character.',55,559);x.fillStyle=palette.cream;x.font='400 25px Instrument Sans Sans';x.fillText('Ideas with a point of view.',65,647);x.fillStyle=palette.lime;x.fillRect(65,720,770,300);x.fillStyle=palette.ink;x.font='600 88px Archivo';x.fillText('Make',96,827);x.fillText('your mark.',96,920);x.fillStyle=palette.cream;x.font='400 17px Instrument Sans Sans';x.fillText('DIGITAL DESIGN / CONCEPT EXPLORATION',65,1115);});
    const digital=new T.Group();group.add(digital);
    const deviceMat=material(palette.dark,.25,.2),screenMat=new T.MeshStandardMaterial({map:screenTexture,roughness:.6,metalness:0,envMapIntensity:.1});
    const device=new T.Mesh(new T.BoxGeometry(2.06,2.75,.12),deviceMat);device.castShadow=true;digital.add(device);
    const screen=new T.Mesh(new T.PlaneGeometry(1.96,2.61),screenMat);screen.position.z=.062;digital.add(screen);
    const shape=new T.Shape(),r=1.32,inside=.76,start=.67,end=Math.PI*2-.67;
    shape.moveTo(Math.cos(start)*r,Math.sin(start)*r);shape.absarc(0,0,r,start,end,false);shape.lineTo(Math.cos(end)*inside,Math.sin(end)*inside);shape.absarc(0,0,inside,end,start,true);shape.closePath();
    const geo=new T.ExtrudeGeometry(shape,{depth:.48,bevelEnabled:true,bevelSegments:5,steps:1,bevelSize:.065,bevelThickness:.06,curveSegments:64});geo.translate(0,0,-.24);geo.computeVertexNormals();
    const object=new T.Group();group.add(object);
    const sculptureMat=material(palette.lime,.22,.12);sculptureMat.envMapIntensity=.2;
    const c=new T.Mesh(geo,sculptureMat);c.castShadow=true;object.add(c);
    const cardTexture=texture(800,440,(x,w,h)=>{x.fillStyle=palette.lime;x.fillRect(0,0,w,h);x.drawImage(logoDark,55,50,380,92);x.fillStyle=palette.ink;x.font='400 24px Instrument Sans Sans';x.fillText('A clear identity.',55,300);x.fillText('A stronger presence.',55,335);x.font='400 16px Instrument Sans Sans';x.fillText('STUDIO CONCEPT',590,380);});
    const card=new T.Mesh(new T.BoxGeometry(1.95,1.073,.023),[cover,cover,cover,cover,new T.MeshStandardMaterial({map:cardTexture,roughness:.7,envMapIntensity:.1}),cover]);card.castShadow=true;group.add(card);
    const poses={
      all:[[-1.45,.42,-.38,-.10,-.40,-.12,1],[1.43,.35,-.64,-.10,-.35,.12,.92],[.13,-.08,1.1,.15,-.38,-.20,1],[-.35,-1.44,1.24,-.55,.22,.12,.95]],
      identity:[[0,.15,.55,-.09,-.30,-.09,1.23],[3.0,.1,-1.6,-.1,-.2,.2,.40],[-2.8,-.9,-1.6,.1,-.3,-.3,.32],[1.3,-1.12,1,-.35,.12,.12,1.02]],
      digital:[[-3.0,.1,-1.7,-.1,-.3,-.2,.38],[0,.1,.7,-.05,-.28,.045,1.42],[2.8,-.6,-1.5,.1,-.4,-.2,.35],[-1.7,-1.4,-1,-.55,.2,.12,.5]],
      objects:[[-2.9,.4,-1.5,-.1,-.3,-.15,.45],[2.7,.3,-1.5,-.1,-.3,.1,.45],[0,.0,.65,.12,-.42,-.10,1.53],[0,-1.8,-1.3,-.5,.2,.1,.45]]
    };
    const things=[book,digital,object,card],bases=things.map(()=>new T.Vector3());
    let selected='all',yaw=0,pitch=0,targetYaw=0,targetPitch=0,time=0,previous=0,transitions=0,dragging=false,startX=0,startY=0,startYaw=0,startPitch=0,manualBudget=0;
    const descriptions=Object.fromEntries(tabs.map(b=>[b.dataset.scene,b.dataset.description]));
    function applyPoses(immediate=false){const target=poses[selected],k=immediate?1:.085;let distance=0;things.forEach((m,i)=>{const p=target[i];bases[i].lerp(new T.Vector3(p[0],p[1],p[2]),k);m.rotation.x+=(p[3]-m.rotation.x)*k;m.rotation.y+=(p[4]-m.rotation.y)*k;m.rotation.z+=(p[5]-m.rotation.z)*k;const next=m.scale.x+(p[6]-m.scale.x)*k;m.scale.setScalar(next);distance+=Math.abs(next-p[6])+bases[i].distanceTo(new T.Vector3(p[0],p[1],p[2]));});transitions=distance>.007?1:0;}
    function tick(now){raf=0;if(destroyed||!visible||document.hidden)return;const dt=Math.min((now-previous)/1000||.016,.035);previous=now;if(!paused)time+=dt;applyPoses(reduced.matches);yaw+=(targetYaw-yaw)*.11;pitch+=(targetPitch-pitch)*.11;group.rotation.set(pitch,yaw,0);things.forEach((m,i)=>{m.position.copy(bases[i]);if(time>0){m.position.y+=Math.sin(time*.66+i*1.5)*.07;m.rotation.z+=Math.sin(time*.43+i)*.00025;}});renderer.render(scene,camera);frameCount++;stage.dataset.frames=String(frameCount);stage.dataset.yaw=yaw.toFixed(3);if(manualBudget>0)manualBudget--;const pending=Math.abs(yaw-targetYaw)+Math.abs(pitch-targetPitch)>.001;if(!paused||transitions||pending||manualBudget>0)raf=requestAnimationFrame(tick);}
    function startFrames(n=1){manualBudget=Math.max(n,manualBudget);if(!raf&&visible&&!document.hidden&&!destroyed){previous=performance.now();raf=requestAnimationFrame(tick);}}
    function size(){const {width,height}=stage.getBoundingClientRect();renderer.setSize(width,height,false);camera.aspect=width/height;camera.position.z=width/height<1.15?12.6:10.0;camera.updateProjectionMatrix();startFrames();}
    function motionLabel(){motion.textContent=paused?stage.dataset.play:stage.dataset.pause;motion.setAttribute('aria-pressed',String(paused));stage.dataset.motion=paused?'paused':'playing';}
    motion.addEventListener('click',()=>{paused=!paused;motionLabel();if(!paused)startFrames();else{cancelAnimationFrame(raf);raf=0;renderer.render(scene,camera);}});
    function resetAll(){targetYaw=0;targetPitch=0;startFrames(70);}
    reset.addEventListener('click',resetAll);
    tabs.forEach(b=>b.addEventListener('click',()=>{selected=b.dataset.scene;tabs.forEach(x=>x.setAttribute('aria-pressed',String(x===b)));document.getElementById('scene-description').textContent=descriptions[selected];document.querySelector('.view-indicator').textContent=stage.dataset.perspective.replace('01','0'+(['all','identity','digital','objects'].indexOf(selected)+1));stage.dataset.view=selected;targetYaw=0;targetPitch=0;if(reduced.matches)applyPoses(true);startFrames(100);}));
    canvas.addEventListener('pointerdown',e=>{dragging=true;startX=e.clientX;startY=e.clientY;startYaw=targetYaw;startPitch=targetPitch;canvas.setPointerCapture(e.pointerId);});
    canvas.addEventListener('pointermove',e=>{if(!dragging)return;targetYaw=Math.max(-1.15,Math.min(1.15,startYaw+(e.clientX-startX)*.007));targetPitch=Math.max(-.3,Math.min(.3,startPitch+(e.clientY-startY)*.003));startFrames(30);});
    const stopDrag=()=>{dragging=false;};canvas.addEventListener('pointerup',stopDrag);canvas.addEventListener('pointercancel',stopDrag);canvas.addEventListener('lostpointercapture',stopDrag);
    canvas.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(e.key)){e.preventDefault();if(e.key==='Home'){resetAll();return;}if(e.key==='ArrowLeft')targetYaw=Math.max(-1.15,targetYaw-.18);if(e.key==='ArrowRight')targetYaw=Math.min(1.15,targetYaw+.18);if(e.key==='ArrowUp')targetPitch=Math.max(-.3,targetPitch-.08);if(e.key==='ArrowDown')targetPitch=Math.min(.3,targetPitch+.08);startFrames(50);}});
    new ResizeObserver(size).observe(stage);
    new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)startFrames();else{cancelAnimationFrame(raf);raf=0;}},{threshold:.02}).observe(stage);
    document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0;}else startFrames();});
    reduced.addEventListener('change',()=>{paused=reduced.matches;motionLabel();startFrames();});
    canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();destroyed=true;fallback();});
    addEventListener('pagehide',()=>{cancelAnimationFrame(raf);raf=0;});addEventListener('pageshow',()=>startFrames());
    motion.disabled=false;reset.disabled=false;tabs.forEach(b=>b.disabled=false);document.querySelector('.drag-hint').textContent=stage.dataset.drag;applyPoses(true);motionLabel();stage.dataset.view='all';stage.dataset.state='ready';size();startFrames();
    // A small read-only diagnostic surface for preview verification; no business data.
    window.crier3d={getState:()=>({view:selected,paused,frames:frameCount,yaw,transitioning:!!transitions,needsFrames:manualBudget,objects:things.length,webgl:stage.dataset.state,visible}),capture:()=>{renderer.render(scene,camera);return canvas.toDataURL('image/png');}};
  }catch(e){console.error('Crier 3D preview could not initialize:',e.message);fallback();}
})();
