
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

// import { chromium } from 'playwright';

export async function launchMeetParticipant(meetUrl: string, virtualMicName: string) {
    // console.log(`Bot joining ${meetUrl} via ${virtualMicName}`);
    
    /*
    const browser = await chromium.launch({
        headless: true,
        args: [
            '--use-fake-ui-for-media-stream',
            '--use-fake-device-for-media-stream',
            '--allow-file-access-from-files',
            `--alsa-input-device=${virtualMicName}` 
        ]
    });
    
    const page = await browser.newPage();
    await page.goto(meetUrl);
    
    // Perform automation: Enter name, click join
    await page.fill('input[type="text"]', 'Linguist Bot');
    await page.click('button:has-text("Join now")');
    
    return { browser, page };
    */
}
