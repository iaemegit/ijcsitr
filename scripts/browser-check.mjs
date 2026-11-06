import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
const browser = await chromium.launch({ channel:'chrome', headless:true });
const page = await browser.newPage({ viewport:{ width:1440,height:1000 } });
const errors=[];page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
const base=process.env.TEST_WEB_URL || 'http://127.0.0.1:4000';
mkdirSync('.local/screenshots',{recursive:true});
try {
  await page.goto(base);await page.getByRole('heading',{level:1,name:'Welcome to IJCSITR',exact:true}).waitFor();assert.equal(await page.locator('#articles, .home-aim-scope').count(),0);
  await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:'.local/screenshots/home-desktop.png',fullPage:true});
  await page.goto(base+'/articles');await page.locator('.article-card').first().waitFor();
  await page.getByRole('button',{name:'Save article'}).first().click();
  await page.goto(base+'/saved');await page.locator('.saved-list article').waitFor();
  await page.reload();await page.locator('.saved-list article').waitFor();
  await page.getByRole('button',{name:'Remove from reading list'}).click();await page.getByRole('heading',{name:'Your next read is waiting'}).waitFor();
  await page.goto(base+'/articles?q=cloud&sort=relevance');await page.locator('.article-card').first().waitFor();
  await page.getByLabel('PUBLICATION YEAR').selectOption('2025');await page.waitForURL(/year=2025/);await page.locator('.article-card').first().waitFor();
  await page.getByRole('link',{name:'Read article',exact:true}).first().click();await page.getByRole('heading',{name:'Abstract',exact:true}).waitFor();
  const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Export citation'}).click();const download=await downloadPromise;assert.ok(download.suggestedFilename().endsWith('.bib'));
  await page.goto(base+'/archives');await page.locator('.issue-card').first().waitFor();
  await page.goto(base+'/editorial-board');await page.locator('.editor-card').first().waitFor();await page.getByRole('textbox',{name:'Search editorial members'}).fill('zzzznonexistent');await page.getByRole('heading',{name:'No matching members'}).waitFor();
  await page.goto(base+'/submit');await page.getByRole('heading',{name:'Tell us about your research.'}).waitFor();await page.getByRole('button',{name:'Submit manuscript',exact:true}).click();assert.equal(await page.locator('input[name=article_title]').evaluate(input=>input.validity.valid),false);
  for(const route of ['/','/articles','/archives','/editorial-board','/submit','/about','/contact','/saved']){
    await page.setViewportSize({width:390,height:844});await page.goto(base+route);await page.locator('main').waitFor();await page.waitForTimeout(300);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),`Horizontal overflow at ${route}`);
  }
  await page.goto(base);await page.getByRole('heading',{level:1,name:'Welcome to IJCSITR',exact:true}).waitFor();await page.getByRole('button',{name:'Toggle navigation'}).click();await page.getByRole('navigation',{name:'Main navigation',exact:true}).getByRole('button',{name:'About',exact:true}).click();assert.equal(await page.locator('#about-navigation li').count(),7);
  await page.goto(base);await page.getByRole('heading',{level:1,name:'Welcome to IJCSITR',exact:true}).waitFor();await page.screenshot({path:'.local/screenshots/home-mobile.png',fullPage:true});
  assert.deepEqual(errors,[]);
  console.log('PASS: desktop/mobile rendering, navigation, real search and filters, persistent bookmarks, article details, citation download, archives, editorial search, required form validation, and no horizontal overflow across all eight main pages.');
} finally {await browser.close();}
