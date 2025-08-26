import puppeteer from 'puppeteer';

(async () => {
  console.log('Abriendo navegador...');
  const browser = await puppeteer.launch({
    headless: true, // cambiar a false si querés verlo y tenés entorno gráfico
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  console.log('Cargando tu app local...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });

  // Extraer título de la página
  const title = await page.title();
  console.log('Título:', title);

  // Guardar captura para revisarla
  await page.screenshot({ path: 'revisar-pagina.png', fullPage: true });
  console.log('Captura guardada: revisar-pagina.png');

  await browser.close();
})();
