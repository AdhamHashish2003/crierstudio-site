// Focused browser verification of the studio integration. No live submissions.
// BASE=http://127.0.0.1:8767 OUTPUT=/path/to/evidence node tests/studio.mjs
import {chromium} from 'playwright-core';
import fs from 'node:fs/promises';
import path from 'node:path';
const BASE=process.env.BASE||'http://127.0.0.1:8767';
const OUTPUT=process.env.OUTPUT||'/tmp/crier-studio-verification';
await fs.mkdir(OUTPUT,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const results=[],errors=[];
const check=(name,pass,details)=>{results.push({name,pass,details});if(!pass)console.log('FAIL',name,JSON.stringify(details));};
async function page(options={}){
 const p=await browser.newPage(options);
 await p.route(/google-analytics|googletagmanager/,r=>r.abort());
 await p.addInitScript(()=>localStorage.setItem('crier_consent','denied'));
 p.on('pageerror',e=>errors.push(e.message));return p;
}
try{
 const p=await page({viewport:{width:1440,height:1050}});
 await p.goto(BASE+'/');await p.waitForFunction(()=>window.crier3d?.getState().frames>1);
 check('WebGL uses the actual scene',await p.locator('#spatial-stage').getAttribute('data-state')==='ready');
 await p.locator('#motion').click();let a=await p.evaluate(()=>crier3d.getState().frames);await p.waitForTimeout(200);let z=await p.evaluate(()=>crier3d.getState().frames);check('Pause stops frames',a===z,{a,z});
 for(const view of ['identity','digital','objects','all']){
  await p.locator(`[data-scene=${view}]`).click();await p.waitForFunction(()=>!crier3d.getState().transitioning&&crier3d.getState().needsFrames===0,null,{timeout:15000});
  check('View '+view,await p.evaluate(v=>crier3d.getState().view===v,view));
 }
 const rect=await p.locator('#spatial-canvas').boundingBox();await p.mouse.move(rect.x+rect.width*.4,rect.y+rect.height*.5);await p.mouse.down();await p.mouse.move(rect.x+rect.width*.7,rect.y+rect.height*.5,{steps:6});await p.mouse.up();await p.waitForFunction(()=>crier3d.getState().yaw>.1);check('Pointer rotation',true);
 await p.locator('#spatial-canvas').focus();await p.keyboard.press('Home');await p.waitForFunction(()=>Math.abs(crier3d.getState().yaw)<.01);await p.keyboard.press('ArrowLeft');await p.waitForFunction(()=>crier3d.getState().yaw<-.05);check('Keyboard rotation and reset',true);
 await p.locator('#motion').click();await p.locator('#project').scrollIntoViewIfNeeded();await p.waitForFunction(()=>!crier3d.getState().visible);a=await p.evaluate(()=>crier3d.getState().frames);await p.waitForTimeout(200);z=await p.evaluate(()=>crier3d.getState().frames);check('Offscreen scene stops rendering',a===z);await p.close();
 for(const lang of ['en','es','fr','ar'])for(const [name,width,height] of [['desktop',1440,1050],['tablet',834,1112],['mobile',390,844]]){
  const q=await page({viewport:{width,height},reducedMotion:'reduce'});await q.goto(BASE+(lang==='en'?'/':'/'+lang+'/'));await q.waitForFunction(()=>window.crier3d?.getState().frames>0);
  await q.waitForTimeout(150);a=await q.evaluate(()=>crier3d.getState().frames);await q.waitForTimeout(150);z=await q.evaluate(()=>crier3d.getState().frames);
  check(`Reduced motion ${lang} ${name}`,a===z&&await q.evaluate(()=>crier3d.getState().paused));
  const metrics=await q.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,h1s:document.querySelectorAll('h1').length,brokenImages:[...document.images].filter(i=>!i.complete||!i.naturalWidth).map(i=>i.src),badAnchors:[...document.querySelectorAll('a[href^="#"]')].map(a=>a.getAttribute('href')).filter(h=>h.length>1&&!document.getElementById(h.slice(1)))}));
  check(`Responsive page ${lang} ${name}`,!metrics.overflow&&metrics.h1s===1&&!metrics.brokenImages.length&&!metrics.badAnchors.length,metrics);
  check(`Localized 3D controls ${lang} ${name}`,await q.evaluate(()=>document.getElementById('motion').textContent===document.getElementById('spatial-stage').dataset.play));
  await q.screenshot({path:path.join(OUTPUT,`${lang}-${name}.png`),fullPage:true});
  if(lang==='en'&&name==='desktop')await q.screenshot({path:path.join(OUTPUT,'homepage.png')});
  if(name==='mobile'){
   await q.locator('.menu-toggle').click();check(`Mobile menu opens ${lang}`,await q.locator('.main-nav').isVisible());await q.keyboard.press('Escape');check(`Mobile menu keyboard closes ${lang}`,!await q.locator('.main-nav').isVisible());
   await q.locator('.menu-toggle').click();await q.locator('.main-nav a').filter({hasText:/./}).nth(1).click();check(`Services navigation ${lang}`,q.url().endsWith('#services')&&!await q.locator('.main-nav').isVisible());
  }
  await q.close();
 }
 const inner=await page({viewport:{width:390,height:844},reducedMotion:'reduce'});
 for(const lang of ['en','es','fr','ar'])for(const route of ['pricing','kit','brand-deck','samples','faq','about','terms','privacy','refund']){
  await inner.goto(BASE+'/'+(lang==='en'?'':lang+'/')+route+'/');
  check(`Inner route ${lang}/${route}`,await inner.evaluate(()=>document.documentElement.scrollWidth===innerWidth&&!!document.querySelector('main')&&!!document.querySelector('h1')));
  if(['pricing','kit','about'].includes(route)&&['en','ar'].includes(lang))await inner.screenshot({path:path.join(OUTPUT,`${lang}-${route}-mobile.png`),fullPage:true});
 }
 await inner.goto(BASE+'/kit/?product=growing&platforms=instagram,tiktok#request');await inner.locator('.langpick a[lang=es]').click();await inner.waitForLoadState('load');
 check('Language switch preserves checkout package/platforms',await inner.evaluate(()=>new URLSearchParams(location.search).get('product')==='growing'&&new URLSearchParams(location.search).get('platforms')==='instagram,tiktok'&&document.querySelector('input[name=product]:checked').value==='growing'));
 await inner.close();
 const fallback=await page({viewport:{width:390,height:844}});await fallback.route('**/three.r128.min.js',r=>r.fulfill({status:200,contentType:'application/javascript',body:''}));await fallback.goto(BASE+'/');await fallback.waitForTimeout(1200);
 check('Blocked WebGL retains real image and disabled controls',await fallback.evaluate(()=>document.getElementById('spatial-stage').dataset.state==='fallback'&&document.querySelector('.stage-fallback img').naturalWidth>0&&document.getElementById('motion').disabled));await fallback.close();
 const nojs=await page({viewport:{width:390,height:844},javaScriptEnabled:false});await nojs.goto(BASE+'/');check('No-JS contact and static scene remain usable',await nojs.locator('a[href^="mailto:team@crierstudio.com"]').count()>0&&await nojs.locator('.stage-fallback img').isVisible());await nojs.close();
 const deck=await page({viewport:{width:1280,height:1000}});await deck.goto(BASE+'/assets/studio-deck/index.html');await deck.evaluate(()=>document.fonts.ready);await deck.emulateMedia({media:'print'});
 const clipping=await deck.locator('.slide').evaluateAll(slides=>slides.map((s,i)=>({page:i+1,overflow:s.scrollHeight>s.clientHeight||s.scrollWidth>s.clientWidth})).filter(x=>x.overflow));
 check('Deck has 12 pages without overflow',await deck.locator('.slide').count()===12&&clipping.length===0,clipping);
 for(let i=0;i<12;i++)await deck.locator('.slide').nth(i).screenshot({path:path.join(OUTPUT,`deck-${String(i+1).padStart(2,'0')}.png`)});
 await deck.pdf({path:path.join(OUTPUT,'Crier-Studio.pdf'),preferCSSPageSize:true,printBackground:true});await deck.close();
 check('No uncaught JavaScript errors',errors.length===0,errors);
}catch(e){check('Verification completed',false,e.stack);}finally{await browser.close();}
await fs.writeFile(path.join(OUTPUT,'verification.json'),JSON.stringify({allPassed:results.every(x=>x.pass),checks:results},null,2));
console.log(JSON.stringify({passed:results.filter(x=>x.pass).length,failed:results.filter(x=>!x.pass),evidence:OUTPUT},null,2));
process.exitCode=results.every(x=>x.pass)?0:1;
