export function textToDom(html: string, ownerDocument: Document) {
  const dummyEl = ownerDocument.createElement('div');
  dummyEl.innerHTML = html;
  return dummyEl;
}

export function inlinePlaceholders(chimpForm: HTMLDivElement) {
  const labels = chimpForm.querySelectorAll('label');
  for (const label in labels) {
    const labelToInline = labels[label];
    if (labelToInline && labelToInline.attributes && labelToInline.getAttribute('for')) {
      const input = chimpForm.querySelector(
        '#' + labelToInline.getAttribute('for'),
      ) as HTMLInputElement;

      if (input && input.type !== 'radio' && !(parseInt(input.getAttribute('maxlength')) < 10)) {
        if (input.tagName === 'SELECT') {
          input.querySelectorAll('option').forEach((option) => {
            if (option.value === '') {
              option.innerText = labelToInline.innerText;
              labelToInline.style.display = 'none';
            } else {
              labelToInline.style.display = 'none';
            }
          });
        } else {
          input.setAttribute('placeholder', labelToInline.innerText);
          labelToInline.style.display = 'none';
        }
      }
    }
  }
  return chimpForm;
}

export function addVevClasses(chimpForm: HTMLDivElement) {
  const inputs = chimpForm.querySelectorAll(
    'input[type="number"],input[type="text"],input[type="url"],input[type="email"],select',
  );
  console.log('got inputs', inputs);
  for (const input in inputs) {
    const inputToStyle = inputs[input];
    if (inputToStyle && inputToStyle.classList) inputToStyle.classList.add('vev-input');
  }
  return chimpForm;
}
