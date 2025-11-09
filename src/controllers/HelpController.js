export class HelpController {
  constructor() {
    this.root = null;
    this.lang = 'he';
    this.data = null;
  }
  async start() {
    this.root = document.getElementById('app');
    await this.loadData();
    this.render();
  }
  async loadData() {
    try {
      const res = await fetch('./src/data/help.json', { cache: 'no-store' });
      this.data = await res.json();
    } catch (e) {
      this.data = { en: { title: 'Help', body: 'Content unavailable.' }, he: { title: 'עזרה', body: 'התוכן אינו זמין.' } };
    }
  }
  setLang(l) {
    this.lang = l;
    this.render();
  }
  render() {
    const d = (this.data && this.data[this.lang]) || { title: '', body: '' };
    const wrapper = document.createElement('div');
    wrapper.className = 'help-wrap';
    // Set direction based on language
    if (this.lang === 'he') {
      wrapper.setAttribute('dir', 'rtl');
    } else {
      wrapper.setAttribute('dir', 'ltr');
    }

    const bar = document.createElement('div');
    bar.className = 'help-bar';

    const tabs = document.createElement('div');
    tabs.className = 'help-tabs';

    const btnHe = document.createElement('button');
    btnHe.textContent = 'עב';
    btnHe.className = this.lang === 'he' ? 'on' : '';
    btnHe.onclick = () => this.setLang('he');

    const btnEn = document.createElement('button');
    btnEn.textContent = 'EN';
    btnEn.className = this.lang === 'en' ? 'on' : '';
    btnEn.onclick = () => this.setLang('en');

    tabs.appendChild(btnHe);
    tabs.appendChild(btnEn);

    const title = document.createElement('h2');
    title.className = 'help-title';
    title.textContent = d.title || '';

    const body = document.createElement('div');
    body.className = 'help-body';
    body.innerHTML = (d.body || '').replace(/\n/g, '<br/>');

    const back = document.createElement('a');
    back.href = '#/single';
    back.className = 'help-back';
    back.textContent = '←';

    bar.appendChild(back);
    bar.appendChild(tabs);

    wrapper.appendChild(bar);
    wrapper.appendChild(title);
    wrapper.appendChild(body);

    const style = document.createElement('style');
    style.textContent = `
      .help-wrap { max-width: 960px; margin: 0 auto; padding: 16px; }
      .help-bar { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:12px; }
      .help-tabs { display:flex; gap:8px; }
      .help-tabs button { background:#1f2937; color:#e6edf3; border:1px solid #334155; padding:8px 10px; border-radius:8px; cursor:pointer; }
      .help-tabs button.on { background:#273449; }
      .help-title { margin: 8px 0 12px; text-align:center; }
      .help-body { background:#0f172a; border:1px solid #1f2937; border-radius:10px; padding:16px; line-height:1.6; }
      .help-wrap[dir='rtl'] .help-body { direction: rtl; text-align: right; }
      .help-wrap[dir='ltr'] .help-body { direction: ltr; text-align: left; }
      .help-back { text-decoration:none; display:inline-flex; align-items:center; justify-content:center; width:36px; height:36px; border-radius:9999px; background:#1f2937; border:1px solid #334155; color:#e6edf3; }
      .help-back:hover { background:#273449; }
    `;

    this.root.innerHTML = '';
    this.root.appendChild(style);
    this.root.appendChild(wrapper);
  }
}
