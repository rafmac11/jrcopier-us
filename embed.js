/**
 * JR Copier Quote Form — Embed Script
 *
 * USAGE:
 *   <div id="jrcopier-form"></div>
 *   <script src="https://YOUR-RAILWAY-URL.up.railway.app/embed.js"></script>
 *
 * OPTIONS (via data attributes on the script tag):
 *   data-container="custom-id"   — Target a custom container ID (default: jrcopier-form)
 *   data-height="700"            — Set iframe height in px (default: 680)
 *   data-width="100%"            — Set iframe width (default: 100%)
 *
 * EVENTS:
 *   Listens for 'jrcopier-form-success' postMessage on successful submission.
 *   window.addEventListener('message', function(e) {
 *     if (e.data.type === 'jrcopier-form-success') {
 *       console.log('Lead submitted:', e.data.data);
 *       // Optionally redirect: window.location.href = '/thank-you';
 *     }
 *   });
 */
(function() {
  // Find the current script tag
  var scripts = document.getElementsByTagName('script');
  var thisScript = scripts[scripts.length - 1];

  // Get the base URL from the script's src
  var src = thisScript.getAttribute('src');
  var baseUrl = src.replace(/\/embed\.js.*$/, '');

  // Get options from data attributes
  var containerId = thisScript.getAttribute('data-container') || 'jrcopier-form';
  var height = thisScript.getAttribute('data-height') || '680';
  var width = thisScript.getAttribute('data-width') || '100%';

  // Find or create container
  var container = document.getElementById(containerId);
  if (!container) {
    container = document.createElement('div');
    container.id = containerId;
    thisScript.parentNode.insertBefore(container, thisScript);
  }

  // Create iframe
  var iframe = document.createElement('iframe');
  iframe.src = baseUrl + '/';
  iframe.style.width = width;
  iframe.style.height = height + 'px';
  iframe.style.border = 'none';
  iframe.style.borderRadius = '12px';
  iframe.style.maxWidth = '520px';
  iframe.style.display = 'block';
  iframe.style.margin = '0 auto';
  iframe.style.overflow = 'hidden';
  iframe.setAttribute('scrolling', 'no');
  iframe.setAttribute('title', 'Get Free Copier & Printer Quotes');
  iframe.setAttribute('loading', 'lazy');
  iframe.setAttribute('allow', 'forms');

  container.appendChild(iframe);
})();
