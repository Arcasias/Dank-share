let color = [255, 0, 0];
let colorPtr = 2;
let colorMult = 1;
const DOMelements = [...document.getElementsByClassName('colored')];
const webhookInput = document.getElementById('webhook-url');

function animate() {
    color[colorPtr % 3] = Math.max(Math.min(color[colorPtr % 3] + 1 * colorMult, 255), 0);
    if ((colorMult > 0 && color[colorPtr % 3] == 255) ||
        (colorMult < 0 && color[colorPtr % 3] == 0)) {
        colorPtr ++;
        colorMult *= -1;
    }

    let hexColor = '#' + color.map(color => color.toString(16).padStart(2, '0')).join('');
    DOMelements.forEach(el => {
        el.style.color = hexColor;
        el.style.outlineColor = hexColor;
    });
    requestAnimationFrame(animate);
}
webhookInput.addEventListener('change', ev => {
    chrome.storage.sync.set({ webhookUrl: webhookInput.value }, () => {
        console.log(`%cWebhook is set to "${webhookInput.value}"`, `color: #${color.map(color => color.toString(16).padStart(2, '0')).join('')}`);
    });
});

chrome.storage.sync.get(['webhookUrl'], result => {
    webhookInput.value = result.webhookUrl || 'Insert your webhook here';
});

animate();
