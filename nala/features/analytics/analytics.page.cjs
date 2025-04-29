export default class CompressPDF {
  constructor(page, nth = 0) {
    this.page = page;
    // accordion locators
    this.section = this.page.locator('.section').nth(nth);
    this.widget = this.page.locator('.verb-widget.compress-pdf.unity-enabled').nth(nth);
    this.verbHeader = this.widget.locator('.verb-header');
    this.verbTitle = this.widget.locator('.verb-title');
    this.verbIcon = this.widget.locator('.verb-icon');
    this.verbHeading = this.widget.locator('h1.verb-heading');
    this.verbDropZone = this.widget.locator('#drop-zone');
    this.selectFileButton = this.widget.locator('.verb-cta-label');
  }
}
