let appState = {
    tagsRaw: [],
    receiptsRaw: [],
    tree: []
};

const treeContainer = document.getElementById('treemap-container');
const sidebarTitle = document.getElementById('sidebar-title');
const sidebarContent = document.getElementById('sidebar-content');
const btnCreateMode = document.getElementById('btn-create-mode');
const btnRefresh = document.getElementById('btn-refresh');

const imageModal = document.getElementById('image-viewer-modal');
const fullImage = document.getElementById('full-image');
const closeViewerBtn = document.querySelector('.close-viewer');

document.addEventListener('DOMContentLoaded', () => {
    initLightbox();
    loadData();
});

btnCreateMode.addEventListener('click', () => setCreateMode());
btnRefresh.addEventListener('click', loadData);

function initLightbox() {
    if (imageModal) {
        closeViewerBtn.onclick = () => imageModal.classList.add('hidden');
        imageModal.onclick = (e) => {
            if (e.target === imageModal) imageModal.classList.add('hidden');
        };
        document.addEventListener('keydown', (e) => {
            if (e.key === "Escape" && !imageModal.classList.contains('hidden')) {
                imageModal.classList.add('hidden');
            }
        });
    }
}

async function loadData() {
    treeContainer.replaceChildren();
    const loading = document.createElement('div');
    loading.className = 'loading';
    loading.textContent = 'Загрузка данных...';
    treeContainer.appendChild(loading);
    
    try {
        const [tagsResponse, receiptsResponse] = await Promise.all([
            fetch('/api/tags'),
            fetch('/api/receipts')
        ]);

        if (!tagsResponse.ok || !receiptsResponse.ok) throw new Error('Ошибка загрузки данных');

        appState.tagsRaw = await tagsResponse.json();
        appState.receiptsRaw = await receiptsResponse.json();
        appState.tree = buildTree(appState.tagsRaw, appState.receiptsRaw);
        
        renderTree();
        
        if (document.querySelectorAll('.receipt-card.active').length === 0) {
            setCreateMode();
        }
    } catch (error) {
        console.error(error);
        treeContainer.innerHTML = '';
        const errDiv = document.createElement('div');
        errDiv.className = 'error';
        errDiv.textContent = `Ошибка: ${error.message}`;
        treeContainer.appendChild(errDiv);
    }
}

function buildTree(tags, receipts) {
    const tagMapById = {};
    const tagMapByName = {}; 

    tags.forEach(tag => {
        const node = { ...tag, children: [], recipes: [] };
        if (tag.id) tagMapById[tag.id] = node;
        if (tag.tag_name) tagMapByName[tag.tag_name] = node;
    });

    receipts.forEach(receipt => {
        const tagNode = tagMapByName[receipt.tag_name];
        if (tagNode) tagNode.recipes.push(receipt);
    });

    const rootNodes = [];
    tags.forEach(tag => {
        const node = tagMapById[tag.id] || tagMapByName[tag.tag_name];
        if (!node) return;

        if (tag.parent_id && tagMapById[tag.parent_id]) {
            tagMapById[tag.parent_id].children.push(node);
        } else if (tag.parent_name && tagMapByName[tag.parent_name]) {
            tagMapByName[tag.parent_name].children.push(node);
        } else {
            rootNodes.push(node);
        }
    });
    return rootNodes;
}

function renderTree() {
    treeContainer.replaceChildren();
    
    if (appState.tree.length === 0) {
        const p = document.createElement('p');
        p.style.textAlign = 'center';
        p.style.padding = '20px';
        p.textContent = 'База пуста.';
        treeContainer.appendChild(p);
        return;
    }

    appState.tree.forEach(rootTag => {
        treeContainer.appendChild(createTagElement(rootTag));
    });
}

function createTagElement(tag) {
    const box = document.createElement('div');
    box.className = 'tag-box';

    const header = document.createElement('div');
    header.className = 'tag-header';
    
    const titleSpan = document.createElement('span');
    titleSpan.textContent = tag.tag_name;
    
    const delSpan = document.createElement('span');
    delSpan.className = 'delete-tag-btn';
    delSpan.title = 'Удалить тег';
    delSpan.innerHTML = '&times;';
    delSpan.onclick = () => deleteTag(tag.tag_name);

    header.appendChild(titleSpan);
    header.appendChild(delSpan);
    box.appendChild(header);

    const content = document.createElement('div');
    content.className = 'tag-content';

    if (tag.children) {
        tag.children.forEach(child => content.appendChild(createTagElement(child)));
    }

    if (tag.recipes) {
        tag.recipes.forEach(receipt => {
            const card = document.createElement('div');
            card.className = 'receipt-card';
            
            if (receipt.image_path) {
                const img = document.createElement('img');
                const safeName = encodeURIComponent(receipt.receipt_name);
                img.src = `/api/get_receipt_image/${safeName}`;
                img.onerror = function() { this.style.display = 'none'; };
                card.appendChild(img);
            }
            
            const title = document.createElement('div');
            title.className = 'receipt-name';
            title.textContent = receipt.receipt_name;
            card.appendChild(title);

            card.addEventListener('click', (e) => {
                e.stopPropagation();
                openReceipt(receipt, tag.tag_name);
                document.querySelectorAll('.receipt-card').forEach(c => c.classList.remove('active'));
                card.classList.add('active');
            });

            content.appendChild(card);
        });
    }

    box.appendChild(content);
    return box;
}

async function postTag(tagName, parentName) {
    try {
        const payload = { tag_name: tagName, parent_name: parentName || null };
        const res = await fetch('/api/add_tag', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });
        if(res.ok) loadData();
        else {
            const err = await res.json();
            alert('Ошибка: ' + (err.detail || 'Не удалось создать тег'));
        }
    } catch(e) { console.error(e); }
}

async function deleteTag(tagName) {
    if(!confirm(`Удалить тег "${tagName}"?`)) return;
    try {
        const res = await fetch(`/api/delete_tag/${encodeURIComponent(tagName)}`, { method: 'DELETE' });
        if(res.ok) loadData();
        else alert('Ошибка удаления');
    } catch(e) { console.error(e); }
}

async function deleteReceipt(name) {
    if(!confirm(`Удалить рецепт "${name}"?`)) return;
    try {
        const res = await fetch(`/api/delete_receipt/${encodeURIComponent(name)}`, { method: 'DELETE' });
        if(res.ok) {
            await loadData();
            setCreateMode();
        } else alert('Ошибка удаления');
    } catch (e) { console.error(e); }
}

function openReceipt(receipt, tagName) {
    sidebarTitle.textContent = "Просмотр";
    sidebarContent.replaceChildren();

    if (receipt.image_path) {
        const img = document.createElement('img');
        const safeName = encodeURIComponent(receipt.receipt_name);
        img.src = `/api/get_receipt_image/${safeName}`;
        img.className = 'view-image';
        img.title = 'Нажмите для увеличения';
        img.onclick = () => {
            fullImage.src = img.src;
            imageModal.classList.remove('hidden');
        };
        img.onerror = function() { this.style.display = 'none'; };
        sidebarContent.appendChild(img);
    }

    const badge = document.createElement('div');
    badge.className = 'badge';
    badge.textContent = `Категория: ${tagName}`;
    sidebarContent.appendChild(badge);

    const h1 = document.createElement('h1');
    h1.style.marginTop = '0';
    h1.textContent = receipt.receipt_name;
    sidebarContent.appendChild(h1);

    const mdBody = document.createElement('div');
    mdBody.className = 'markdown-body';
    mdBody.innerHTML = marked.parse(receipt.description);
    sidebarContent.appendChild(mdBody);

    const btnContainer = document.createElement('div');
    btnContainer.style.display = 'flex';
    btnContainer.style.gap = '10px';
    btnContainer.style.marginTop = '20px';

    const editBtn = document.createElement('button');
    editBtn.className = 'btn-primary';
    editBtn.style.flex = '1';
    editBtn.textContent = 'Изменить';
    editBtn.onclick = () => setEditMode(receipt, tagName);
    
    const delBtn = document.createElement('button');
    delBtn.className = 'btn-delete';
    delBtn.style.flex = '1';
    delBtn.style.marginTop = '0';
    delBtn.textContent = 'Удалить';
    delBtn.onclick = () => deleteReceipt(receipt.receipt_name);

    btnContainer.appendChild(editBtn);
    btnContainer.appendChild(delBtn);
    sidebarContent.appendChild(btnContainer);
}

function createFormGroup(labelText, inputElement) {
    const div = document.createElement('div');
    div.className = 'form-group';
    const label = document.createElement('label');
    label.textContent = labelText;
    div.appendChild(label);
    div.appendChild(inputElement);
    return div;
}

// Вспомогательная функция для инициализации Tom Select на всех select'ах в контейнере
function applyCustomSelects(container) {
    const selects = container.querySelectorAll('select');
    selects.forEach(el => {
        new TomSelect(el, {
            create: false,
            sortField: [], // Отключаем авто-сортировку, чтобы сохранить структуру дерева
            placeholder: 'Выберите значение...'
        });
    });
}

function setEditMode(receipt, currentTagName) {
    sidebarTitle.textContent = "Редактирование";
    sidebarContent.replaceChildren();

    const form = document.createElement('form');
    
    const hiddenOriginal = document.createElement('input');
    hiddenOriginal.type = 'hidden';
    hiddenOriginal.name = 'original_name';
    hiddenOriginal.value = receipt.receipt_name;
    form.appendChild(hiddenOriginal);

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.name = 'receipt_name';
    nameInput.className = 'form-control';
    nameInput.value = receipt.receipt_name;
    nameInput.required = true;
    form.appendChild(createFormGroup('Название блюда', nameInput));

    const tagSelect = document.createElement('select');
    tagSelect.name = 'tag_name';
    tagSelect.className = 'form-control'; // Tom Select заменит это
    tagSelect.required = true;
    fillSelectOptions(tagSelect, appState.tree, 0, currentTagName);
    form.appendChild(createFormGroup('Категория', tagSelect));

    const imgInput = document.createElement('input');
    imgInput.type = 'text';
    imgInput.name = 'image_path';
    imgInput.className = 'form-control';
    imgInput.value = receipt.image_path || '';
    form.appendChild(createFormGroup('Путь к картинке', imgInput));

    const descInput = document.createElement('textarea');
    descInput.name = 'description';
    descInput.className = 'form-control';
    descInput.value = receipt.description;
    form.appendChild(createFormGroup('Рецепт (Markdown)', descInput));

    const btnContainer = document.createElement('div');
    btnContainer.style.display = 'flex';
    btnContainer.style.gap = '10px';

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'btn-primary';
    cancelBtn.style.background = '#94a3b8';
    cancelBtn.textContent = 'Отмена';
    cancelBtn.onclick = () => {
        const r = appState.receiptsRaw.find(x => x.receipt_name === receipt.receipt_name);
        openReceipt(r || receipt, currentTagName);
    };

    const submitBtn = document.createElement('button');
    submitBtn.type = 'submit';
    submitBtn.className = 'btn-primary';
    submitBtn.textContent = 'Сохранить';

    btnContainer.appendChild(cancelBtn);
    btnContainer.appendChild(submitBtn);
    form.appendChild(btnContainer);

    form.addEventListener('submit', handleUpdateReceipt);
    sidebarContent.appendChild(form);

    // Применяем красивые селекты
    applyCustomSelects(form);
}

async function handleUpdateReceipt(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const originalName = formData.get('original_name');

    const data = {
        receipt_name: formData.get('receipt_name'),
        description: formData.get('description') || '',
        image_path: formData.get('image_path') || null,
        tag_name: formData.get('tag_name') 
    };

    try {
        const response = await fetch(`/api/update_receipt/${encodeURIComponent(originalName)}`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(data)
        });

        if (response.ok) {
            await loadData();
            const updatedReceipt = appState.receiptsRaw.find(r => r.receipt_name === data.receipt_name);
            if (updatedReceipt) {
                openReceipt(updatedReceipt, data.tag_name);
                setTimeout(() => {
                    const cards = document.querySelectorAll('.receipt-card');
                    for (let c of cards) {
                        if (c.querySelector('.receipt-name').textContent === data.receipt_name) {
                            c.classList.add('active');
                            break;
                        }
                    }
                }, 100);
            }
        } else {
            const err = await response.json();
            alert('Ошибка: ' + (err.detail || 'Не удалось обновить'));
        }
    } catch (err) {
        console.error(err);
        alert('Ошибка сети');
    }
}

function setCreateMode() {
    sidebarTitle.textContent = "Управление";
    document.querySelectorAll('.receipt-card').forEach(c => c.classList.remove('active'));
    sidebarContent.replaceChildren();

    // Section Tag
    const tagSection = document.createElement('div');
    tagSection.style.marginBottom = '25px';
    tagSection.style.paddingBottom = '25px';
    tagSection.style.borderBottom = '1px solid #eee';

    const h3Tag = document.createElement('h3');
    h3Tag.style.marginTop = '0';
    h3Tag.textContent = 'Добавить тег';
    tagSection.appendChild(h3Tag);

    const tagForm = document.createElement('form');
    
    const tagNameInput = document.createElement('input');
    tagNameInput.type = 'text';
    tagNameInput.name = 'new_tag_name';
    tagNameInput.className = 'form-control';
    tagNameInput.placeholder = 'Например: Супы';
    tagNameInput.required = true;
    tagForm.appendChild(createFormGroup('Название нового тега', tagNameInput));

    const parentSelect = document.createElement('select');
    parentSelect.name = 'parent_name';
    parentSelect.className = 'form-control';
    const optDefault = document.createElement('option');
    optDefault.value = '';
    optDefault.textContent = '-- (Корневой уровень) --';
    parentSelect.appendChild(optDefault);
    fillSelectOptions(parentSelect, appState.tree);
    tagForm.appendChild(createFormGroup('Родительский тег', parentSelect));

    const tagSubmit = document.createElement('button');
    tagSubmit.type = 'submit';
    tagSubmit.className = 'btn-primary';
    tagSubmit.style.background = '#64748b';
    tagSubmit.textContent = 'Создать тег';
    tagForm.appendChild(tagSubmit);

    tagForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        await postTag(fd.get('new_tag_name'), fd.get('parent_name'));
        e.target.reset();
    });

    tagSection.appendChild(tagForm);
    sidebarContent.appendChild(tagSection);

    // Section Receipt
    const h3Receipt = document.createElement('h3');
    h3Receipt.textContent = 'Добавить рецепт';
    sidebarContent.appendChild(h3Receipt);

    const receiptForm = document.createElement('form');
    
    const rNameInput = document.createElement('input');
    rNameInput.type = 'text';
    rNameInput.name = 'receipt_name';
    rNameInput.className = 'form-control';
    rNameInput.required = true;
    receiptForm.appendChild(createFormGroup('Название блюда', rNameInput));

    const rTagSelect = document.createElement('select');
    rTagSelect.name = 'tag_name';
    rTagSelect.className = 'form-control';
    rTagSelect.required = true;
    const optDisabled = document.createElement('option');
    optDisabled.value = '';
    optDisabled.textContent = ''; // TomSelect использует placeholder
    optDisabled.selected = true;
    rTagSelect.appendChild(optDisabled);
    fillSelectOptions(rTagSelect, appState.tree);
    receiptForm.appendChild(createFormGroup('Категория', rTagSelect));

    const rImgInput = document.createElement('input');
    rImgInput.type = 'text';
    rImgInput.name = 'image_path';
    rImgInput.className = 'form-control';
    receiptForm.appendChild(createFormGroup('Путь к файлу или URL', rImgInput));

    const rDescInput = document.createElement('textarea');
    rDescInput.name = 'description';
    rDescInput.className = 'form-control';
    receiptForm.appendChild(createFormGroup('Рецепт (Markdown)', rDescInput));

    const rSubmit = document.createElement('button');
    rSubmit.type = 'submit';
    rSubmit.className = 'btn-primary';
    rSubmit.textContent = 'Сохранить рецепт';
    receiptForm.appendChild(rSubmit);

    receiptForm.addEventListener('submit', handleCreateReceipt);
    sidebarContent.appendChild(receiptForm);

    // Применяем красивые селекты ко всем формам в сайдбаре
    applyCustomSelects(sidebarContent);
}

function fillSelectOptions(selectElement, nodes, level = 0, selectedTag = null) {
    nodes.forEach(node => {
        const option = document.createElement('option');
        option.value = node.tag_name;
        
        // Используем non-breaking space для визуального отступа,
        // Tom Select обычно рендерит HTML/текст нормально
        const prefix = '\u00A0\u00A0'.repeat(level) + (level > 0 ? '└ ' : '');
        option.textContent = prefix + node.tag_name;

        if (node.tag_name === selectedTag) {
            option.selected = true;
        }
        selectElement.appendChild(option);

        if (node.children && node.children.length > 0) {
            fillSelectOptions(selectElement, node.children, level + 1, selectedTag);
        }
    });
}

async function handleCreateReceipt(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
        receipt_name: formData.get('receipt_name'),
        description: formData.get('description') || '',
        image_path: formData.get('image_path') || null,
        tag_name: formData.get('tag_name') 
    };

    try {
        const response = await fetch('/api/add_receipt', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(data)
        });
        if (response.ok) loadData();
        else alert('Ошибка сервера');
    } catch (err) {
        console.error(err);
        alert('Ошибка сети');
    }
}