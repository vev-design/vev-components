export function textToDom(html: string, ownerDocument: Document) {
  const dummyEl = ownerDocument.createElement('div');
  dummyEl.innerHTML = html;
  return dummyEl;
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
