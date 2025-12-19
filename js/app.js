/**
 * APP CONTROLLER
 * Contains: UI Rendering, Event Listeners, Charts, Profile Logic
 */

const App = {
    charts: {},

    init() {
        DB.load(); // Gọi từ core.js
        this.Theme.init();
        this.setupUI();
        this.Events.bind();
        this.runIntro();
    },

    runIntro() {
        const text = ":Device/LocalStorage/Score-Data...";
        const typingEl = document.getElementById('typing-text');
        let i = 0;
        
        const type = () => {
            if (i < text.length) {
                typingEl.innerHTML += text.charAt(i);
                i++;
                setTimeout(type, 50);
            } else {
                setTimeout(() => {
                    const intro = document.getElementById('intro-layer');
                    intro.style.opacity = '0';
                    setTimeout(() => intro.remove(), 600);
                }, 1200);
            }
        };
        setTimeout(type, 300);
    },

    setupUI() {
        document.getElementById('user-display-name').innerText = DB.data.user.name;
        if(DB.data.user.avatar) {
            document.getElementById('header-avatar').src = DB.data.user.avatar;
        }
        document.getElementById('setting-scale').value = DB.data.settings.scale;
        
        this.renderInputs('5:5');
        this.refreshAll();
    },

    refreshAll() {
        this.renderDashboard();
        this.History.render(); // Changed to use History module
        this.renderAnalytics();
    },

    Events: {
        bind() {
            // Navigation
            const navs = document.querySelectorAll('.nav-item, .m-nav-item');
            navs.forEach(btn => {
                if(btn.classList.contains('center-fab')) return; 
                btn.onclick = () => {
                    if(navigator.vibrate) navigator.vibrate(40);
                    const target = btn.dataset.target;
                    App.navigateTo(target);
                };
            });

            // Calculator
            document.getElementById('weight-select').onchange = (e) => App.renderInputs(e.target.value);
            document.getElementById('btn-reset-calc').onclick = () => {
                if(navigator.vibrate) navigator.vibrate(20);
                document.querySelectorAll('#dynamic-scores input').forEach(i => i.value = '');
                document.getElementById('subject-name').value = '';
            };
            document.getElementById('btn-calc').onclick = App.handleCalculate;
            document.getElementById('btn-save-result').onclick = App.handleSaveResult;
            
            // Filters
            document.getElementById('search-history').onkeyup = (e) => {
                App.History.setSearch(e.target.value);
            };
            document.querySelectorAll('.tab').forEach(t => {
                t.onclick = () => {
                    if(navigator.vibrate) navigator.vibrate(20);
                    document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
                    t.classList.add('active');
                    App.History.setFilter(t.dataset.filter);
                }
            });

            // File Import
            document.getElementById('import-file').onchange = App.handleImport;
            document.getElementById('file-upload').onchange = App.Profile.handleFileSelect;
        }
    },

    navigateTo(target) {
        document.querySelectorAll('.nav-item, .m-nav-item').forEach(b => b.classList.remove('active'));
        document.querySelectorAll(`[data-target="${target}"]`).forEach(b => b.classList.add('active'));
        
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.getElementById(target).classList.add('active');
        document.querySelector('.content-scroll-area').scrollTop = 0;
    },

    goToCalc() {
        if(navigator.vibrate) navigator.vibrate(60);
        App.navigateTo('calculator');
        setTimeout(() => document.getElementById('subject-name').focus(), 300);
    },

    Theme: {
        init() {
            const saved = localStorage.getItem(CONFIG.THEME_KEY);
            const isDark = saved === null ? true : (saved === 'dark');
            
            if(isDark) document.body.setAttribute('data-theme', 'dark');
            else document.body.removeAttribute('data-theme');
            
            const toggleBtn = document.getElementById('theme-toggle');
            const switchInput = document.getElementById('theme-switch-input');
            
            if(switchInput) switchInput.checked = isDark;

            const toggleLogic = () => {
                const current = document.body.getAttribute('data-theme') === 'dark';
                if(navigator.vibrate) navigator.vibrate(30);

                if(current) {
                    document.body.removeAttribute('data-theme');
                    localStorage.setItem(CONFIG.THEME_KEY, 'light');
                    if(switchInput) switchInput.checked = false;
                } else {
                    document.body.setAttribute('data-theme', 'dark');
                    localStorage.setItem(CONFIG.THEME_KEY, 'dark');
                    if(switchInput) switchInput.checked = true;
                }
                App.renderDashboard(); 
            };

            if(toggleBtn) toggleBtn.onclick = toggleLogic;
            if(switchInput) switchInput.onchange = toggleLogic;
        }
    },

    renderInputs(ratio) {
        const container = document.getElementById('dynamic-scores');
        container.innerHTML = '';
        const labels = {
            '5:5': ['Quá trình (50%)', 'Cuối kỳ (50%)'],
            '4:6': ['Quá trình (40%)', 'Cuối kỳ (60%)'],
            '3:7': ['Quá trình (30%)', 'Cuối kỳ (70%)'],
            '2:3:5': ['CC (20%)', 'GK (30%)', 'CK (50%)'],
            '100': ['Điểm tổng kết (100%)']
        };
        labels[ratio].forEach(lbl => {
            const div = document.createElement('div');
            div.className = 'form-group';
            div.innerHTML = `<label>${lbl}</label><input type="number" class="calc-input" step="0.1" placeholder="0 - 10">`;
            container.appendChild(div);
        });
    },

    handleCalculate() {
        if(navigator.vibrate) navigator.vibrate(40);
        const inputs = Array.from(document.querySelectorAll('.calc-input')).map(i => i.value);
        const ratio = document.getElementById('weight-select').value;
        const score = Grading.calcSubject(inputs, ratio);
        
        if(score === null) return alert("Vui lòng nhập điểm hợp lệ từ 0 đến 10");
        
        const scale = DB.data.settings.scale || 'DEFAULT';
        const info = Grading.rules[scale](score);
        
        document.getElementById('res-subject').innerText = document.getElementById('subject-name').value || 'Môn học mới';
        document.getElementById('res-grade').innerText = info.g;
        document.getElementById('res-10').innerText = score;
        document.getElementById('res-4').innerText = info.p;
        document.getElementById('result-modal').showModal();
    },

    handleSaveResult() {
        if(navigator.vibrate) navigator.vibrate(50);
        const name = document.getElementById('subject-name').value || 'Môn học không tên';
        const credits = document.getElementById('subject-credits').value;
        const score10 = document.getElementById('res-10').innerText;
        const ratio = document.getElementById('weight-select').value;
        
        // Save to current folder context if inside one, else root (null)
        const currentFolder = App.History.state.currentFolderId;

        DB.data.history.unshift({
            id: Date.now(),
            name, credits, score: score10, type: ratio, date: Date.now(),
            folderId: currentFolder 
        });
        DB.save();
        document.getElementById('result-modal').close();
        
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
        App.refreshAll();
        document.getElementById('btn-reset-calc').click();
    },

    // --- HISTORY MODULE (NEW) ---
    History: {
        state: {
            currentFolderId: null,
            search: '',
            filter: 'all',
            page: 1,
            perPage: 10,
            selectionMode: false,
            selectedIds: new Set()
        },

        setSearch(val) { this.state.search = val; this.state.page = 1; this.render(); },
        setFilter(val) { this.state.filter = val; this.state.page = 1; this.render(); },
        changePage(dir) { this.state.page += dir; this.render(); },
        
        goRoot() {
            this.state.currentFolderId = null;
            this.state.page = 1;
            this.state.selectionMode = false;
            this.state.selectedIds.clear();
            this.render();
        },

        enterFolder(id) {
            this.state.currentFolderId = id;
            this.state.page = 1;
            this.state.selectionMode = false;
            this.state.selectedIds.clear();
            this.render();
        },

        toggleSelectionMode() {
            this.state.selectionMode = !this.state.selectionMode;
            if(!this.state.selectionMode) this.state.selectedIds.clear();
            this.render();
        },

        selectItem(id) {
            if(this.state.selectedIds.has(id)) this.state.selectedIds.delete(id);
            else this.state.selectedIds.add(id);
            this.render();
        },

        render() {
            const list = document.getElementById('history-list');
            list.innerHTML = '';
            
            // 1. Filter Data
            let items = DB.data.history.filter(h => h.folderId === this.state.currentFolderId);
            let folders = DB.data.folders.filter(f => this.state.currentFolderId === null); // Only show folders at root for now
            
            if(this.state.currentFolderId) {
                 // We are in a folder
                 folders = []; // No nested folders in this version for simplicity
                 const folderName = DB.data.folders.find(f => f.id === this.state.currentFolderId)?.name || 'Unknown';
                 document.getElementById('history-breadcrumb').style.display = 'flex';
                 document.getElementById('crumb-folder-name').innerText = folderName;
            } else {
                 document.getElementById('history-breadcrumb').style.display = 'none';
            }

            // Apply Search & Filter
            if(this.state.search) {
                const s = this.state.search.toLowerCase();
                items = items.filter(i => i.name.toLowerCase().includes(s));
                // Only show folders if name matches search
                folders = folders.filter(f => f.name.toLowerCase().includes(s));
            }
            if(this.state.filter === 'pass') items = items.filter(i => i.score >= 4.0);
            if(this.state.filter === 'fail') items = items.filter(i => i.score < 4.0);

            // Combine for Pagination: Folders first (sorted by order), then Items (sorted by date)
            folders.sort((a,b) => (a.order || 0) - (b.order || 0));
            items.sort((a,b) => b.date - a.date);
            
            const combined = [...folders.map(f => ({...f, type: 'folder'})), ...items.map(i => ({...i, type: 'item'}))];
            
            // Pagination Logic
            const totalPages = Math.ceil(combined.length / this.state.perPage) || 1;
            if(this.state.page > totalPages) this.state.page = totalPages;
            if(this.state.page < 1) this.state.page = 1;
            
            const start = (this.state.page - 1) * this.state.perPage;
            const end = start + this.state.perPage;
            const viewData = combined.slice(start, end);

            // Update Pagination UI
            document.getElementById('page-info').innerText = `${this.state.page} / ${totalPages}`;
            document.getElementById('prev-page').disabled = this.state.page === 1;
            document.getElementById('next-page').disabled = this.state.page === totalPages;

            // Render Selection Toolbar
            const actionbar = document.getElementById('history-actions');
            const trigger = document.getElementById('select-trigger-container');
            if(this.state.selectionMode) {
                actionbar.classList.remove('hidden');
                trigger.style.display = 'none';
                document.getElementById('select-count').innerText = `${this.state.selectedIds.size} đã chọn`;
            } else {
                actionbar.classList.add('hidden');
                trigger.style.display = 'flex';
            }

            // Render Items
            if(viewData.length === 0) {
                list.innerHTML = `<div style="text-align:center; padding:30px; color:var(--text-sec); opacity:0.7">Trống</div>`;
                return;
            }

            const scale = DB.data.settings.scale || 'DEFAULT';

            viewData.forEach(obj => {
                if(obj.type === 'folder') {
                    // Render Folder
                    const el = document.createElement('div');
                    el.className = 'folder-item';
                    el.draggable = !this.state.selectionMode; // Only drag when not selecting
                    el.dataset.id = obj.id;
                    
                    // Drag Events
                    el.addEventListener('dragstart', this.handleDragStart);
                    el.addEventListener('dragover', this.handleDragOver);
                    el.addEventListener('drop', this.handleDrop);
                    el.addEventListener('dragend', this.handleDragEnd);
                    // Touch Drag shim would go here for mobile, but simplified for now

                    el.innerHTML = `
                        <div class="folder-icon"><span class="material-symbols-rounded">folder</span></div>
                        <div class="folder-info" onclick="App.History.enterFolder('${obj.id}')">
                            <div class="folder-name">${obj.name}</div>
                            <div class="folder-meta">Thư mục</div>
                        </div>
                        <div class="folder-actions">
                            <button class="btn-text" onclick="App.History.renameFolder('${obj.id}', '${obj.name}')"><span class="material-symbols-rounded">edit</span></button>
                            <button class="btn-text" style="color:var(--danger)" onclick="App.History.deleteFolder('${obj.id}')"><span class="material-symbols-rounded">delete</span></button>
                        </div>
                    `;
                    list.appendChild(el);
                } else {
                    // Render Item
                    const isPass = obj.score >= 4.0;
                    const info = Grading.rules[scale](parseFloat(obj.score));
                    const isSelected = this.state.selectedIds.has(obj.id);
                    
                    const el = document.createElement('div');
                    el.className = 'history-item';
                    el.innerHTML = `
                        ${this.state.selectionMode ? `
                            <div class="select-checkbox ${isSelected?'checked':''}" onclick="App.History.selectItem(${obj.id})">
                                <span class="material-symbols-rounded">check</span>
                            </div>
                        ` : ''}
                        <div class="h-info" onclick="${this.state.selectionMode ? `App.History.selectItem(${obj.id})` : ''}">
                            <h4>${obj.name}</h4>
                            <span class="h-meta">${obj.credits} tín chỉ • ${new Date(obj.date).toLocaleDateString()}</span>
                        </div>
                        <div style="display:flex; gap:12px; align-items:center;">
                            <div class="h-grade-box ${isPass ? 'grade-pass' : 'grade-fail'}">${info.g}</div>
                            ${!this.state.selectionMode ? `
                            <button class="btn-text" style="color:var(--danger); padding:5px" onclick="App.History.deleteItem(${obj.id})">
                                <span class="material-symbols-rounded">delete</span>
                            </button>` : ''}
                        </div>
                    `;
                    list.appendChild(el);
                }
            });
        },

        // --- Actions ---
        createNewFolderEmpty() {
            const name = prompt("Tên thư mục mới:", "Học kỳ mới");
            if(name) {
                const newFolder = { id: 'f_' + Date.now(), name, order: DB.data.folders.length, dateCreated: Date.now() };
                DB.data.folders.push(newFolder);
                DB.save();
                this.render();
            }
        },

        createFolderFromSelection() {
            if(this.state.selectedIds.size === 0) return alert("Chưa chọn mục nào!");
            const name = prompt("Tên thư mục mới cho các mục đã chọn:");
            if(!name) return;

            const newId = 'f_' + Date.now();
            const newFolder = { id: newId, name, order: DB.data.folders.length, dateCreated: Date.now() };
            
            DB.data.folders.push(newFolder);
            
            // Update items
            DB.data.history.forEach(h => {
                if(this.state.selectedIds.has(h.id)) h.folderId = newId;
            });
            
            DB.save();
            this.state.selectionMode = false;
            this.state.selectedIds.clear();
            this.render();
        },

        renameFolder(id, oldName) {
            const newName = prompt("Đổi tên thư mục:", oldName);
            if(newName && newName !== oldName) {
                const f = DB.data.folders.find(x => x.id === id);
                if(f) f.name = newName;
                DB.save();
                this.render();
            }
        },

        deleteFolder(id) {
            if(confirm("Xóa thư mục này? Các môn học bên trong sẽ được đưa ra ngoài.")) {
                // Move items out
                DB.data.history.forEach(h => { if(h.folderId === id) h.folderId = null; });
                // Delete folder
                DB.data.folders = DB.data.folders.filter(f => f.id !== id);
                DB.save();
                this.render();
            }
        },

        deleteItem(id) {
            if(confirm("Xóa môn học này?")) {
                DB.data.history = DB.data.history.filter(h => h.id !== id);
                DB.save();
                App.refreshAll();
            }
        },

        deleteSelected() {
            if(confirm(`Xóa ${this.state.selectedIds.size} mục đã chọn?`)) {
                DB.data.history = DB.data.history.filter(h => !this.state.selectedIds.has(h.id));
                DB.save();
                this.state.selectionMode = false;
                this.state.selectedIds.clear();
                App.refreshAll();
            }
        },

        // --- Drag & Drop Handlers ---
        dragSrcEl: null,
        handleDragStart(e) {
            this.style.opacity = '0.4';
            App.History.dragSrcEl = this;
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/html', this.innerHTML);
            this.classList.add('dragging');
        },
        handleDragOver(e) {
            if (e.preventDefault) e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            return false;
        },
        handleDrop(e) {
            if (e.stopPropagation) e.stopPropagation();
            const srcEl = App.History.dragSrcEl;
            if (srcEl !== this && this.classList.contains('folder-item')) {
                // Swap Logic in DB
                const srcId = srcEl.dataset.id;
                const targetId = this.dataset.id;
                
                const srcIdx = DB.data.folders.findIndex(f => f.id === srcId);
                const targetIdx = DB.data.folders.findIndex(f => f.id === targetId);
                
                // Swap order values
                const tempOrder = DB.data.folders[srcIdx].order;
                DB.data.folders[srcIdx].order = DB.data.folders[targetIdx].order;
                DB.data.folders[targetIdx].order = tempOrder;
                
                DB.save();
                App.History.render();
            }
            return false;
        },
        handleDragEnd(e) {
            this.style.opacity = '1';
            this.classList.remove('dragging');
        }
    },

    renderDashboard() {
        const stats = Grading.getStats(DB.data.history);
        
        App.animateValue('dash-gpa-4', parseFloat(document.getElementById('dash-gpa-4').innerText), stats.gpa4, 1000);
        document.getElementById('dash-pass').innerText = stats.pass;
        document.getElementById('dash-fail').innerText = stats.fail;
        document.getElementById('dash-credits').innerText = stats.credits;
        document.getElementById('gpa-percent').innerText = Math.round(stats.percent) + '%';
        
        const circle = document.getElementById('gpa-circle-stroke');
        circle.style.strokeDasharray = `${stats.percent}, 100`;

        let rank = "Chưa xếp loại";
        if(stats.gpa4 >= 3.6) rank = "Xuất sắc";
        else if(stats.gpa4 >= 3.2) rank = "Giỏi";
        else if(stats.gpa4 >= 2.5) rank = "Khá";
        else if(stats.gpa4 >= 2.0) rank = "Trung bình";
        else if(stats.credits > 0) rank = "Yếu";
        document.getElementById('gpa-rank').innerText = rank;

        App.drawDashboardChart();
    },

    drawDashboardChart() {
        const ctx = document.getElementById('dashboardChart').getContext('2d');
        const dist = {A:0, B:0, C:0, D:0, F:0};
        const scale = DB.data.settings.scale || 'DEFAULT';
        DB.data.history.forEach(h => {
            const g = Grading.rules[scale](parseFloat(h.score)).g.charAt(0);
            if(dist[g] !== undefined) dist[g]++; else dist.F++;
        });

        if(App.charts.bar) App.charts.bar.destroy();
        
        const isDark = document.body.getAttribute('data-theme') === 'dark';
        const color = isDark ? 'rgba(255,255,255,0.7)' : '#636e72';

        App.charts.bar = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(dist),
                datasets: [{
                    label: 'Số môn',
                    data: Object.values(dist),
                    backgroundColor: ['#00b894', '#0984e3', '#fdcb6e', '#e17055', '#d63031'],
                    borderRadius: 8,
                    barThickness: 30
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, ticks: { stepSize: 1, color: color }, grid: { display: false } },
                    x: { ticks: { color: color }, grid: { display: false } }
                }
            }
        });
    },

    renderAnalytics() {
        const h = DB.data.history;
        if(!h.length) return;
        
        // Avg 10
        const total = h.reduce((a,b) => a + parseFloat(b.score), 0);
        document.getElementById('insight-avg-10').innerText = (total / h.length).toFixed(2);
        
        // Best
        const best = h.reduce((p,c) => parseFloat(p.score) > parseFloat(c.score) ? p : c);
        document.getElementById('insight-best-subject').innerText = `${best.name} (${best.score})`;
        
        // Goal
        App.Analytics.checkGoal();
        
        // Radar Chart
        App.Analytics.drawRadar();
    },

    Analytics: {
        setGoal() {
            const g = parseFloat(document.getElementById('goal-gpa').value);
            if(g > 0 && g <= 4.0) { DB.data.settings.goal = g; DB.save(); this.checkGoal(); }
        },
        checkGoal() {
            const current = parseFloat(document.getElementById('dash-gpa-4').innerText);
            const goal = DB.data.settings.goal || 3.6;
            const msg = document.getElementById('goal-message');
            
            if(current >= goal) {
                msg.innerText = "🎉 Tuyệt vời! Bạn đã đạt mục tiêu!"; msg.style.color = "var(--success)";
            } else {
                msg.innerText = `Cần cố gắng thêm ${(goal - current).toFixed(2)} điểm nữa.`;
                msg.style.color = "var(--text-sec)";
            }
        },
        drawRadar() {
            const ctx = document.getElementById('radarChart').getContext('2d');
            const scale = DB.data.settings.scale || 'DEFAULT';
            const counts = { 'A/A+':0, 'B/B+':0, 'C/C+':0, 'D/D+':0, 'F':0 };
            
            DB.data.history.forEach(h => {
                const g = Grading.rules[scale](parseFloat(h.score)).g;
                if(g.includes('A')) counts['A/A+']++;
                else if(g.includes('B')) counts['B/B+']++;
                else if(g.includes('C')) counts['C/C+']++;
                else if(g.includes('D')) counts['D/D+']++;
                else counts['F']++;
            });

            if(App.charts.radar) App.charts.radar.destroy();
            
            const isDark = document.body.getAttribute('data-theme') === 'dark';
            const gridColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

            App.charts.radar = new Chart(ctx, {
                type: 'radar',
                data: {
                    labels: Object.keys(counts),
                    datasets: [{
                        label: 'Phân bố',
                        data: Object.values(counts),
                        backgroundColor: 'rgba(108, 92, 231, 0.3)',
                        borderColor: '#6c5ce7',
                        pointBackgroundColor: '#a29bfe'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: { 
                        r: { 
                            suggestMin: 0, 
                            ticks: { display: false },
                            grid: { color: gridColor },
                            angleLines: { color: gridColor }
                        } 
                    },
                    plugins: { legend: { display: false } }
                }
            });
        }
    },

    // --- PROFILE & GIF SUPPORT ---
    Profile: {
        cropper: null,
        triggerUpload() {
            document.getElementById('file-upload').click();
        },
        openModal() {
            document.getElementById('crop-modal-overlay').classList.remove('hidden');
        },
        closeModal() {
            document.getElementById('crop-modal-overlay').classList.add('hidden');
            if(this.cropper) { this.cropper.destroy(); this.cropper = null; }
            document.getElementById('file-upload').value = '';
        },
        handleFileSelect(e) {
            const file = e.target.files[0];
            if(!file) return;

            if(file.type === 'image/gif') {
                const reader = new FileReader();
                reader.onload = (evt) => {
                    if(evt.target.result.length > 3000000) {
                        alert("File GIF quá lớn (>3MB), vui lòng chọn ảnh nhẹ hơn.");
                        return;
                    }
                    DB.data.user.avatar = evt.target.result;
                    DB.save();
                    document.getElementById('header-avatar').src = evt.target.result;
                    App.Profile.closeModal(); 
                };
                reader.readAsDataURL(file);
            } else {
                const reader = new FileReader();
                reader.onload = (evt) => {
                    const img = document.getElementById('image-to-crop');
                    img.src = evt.target.result;
                    App.Profile.openModal(); 
                    
                    if(App.Profile.cropper) App.Profile.cropper.destroy();
                    App.Profile.cropper = new Cropper(img, {
                        aspectRatio: 1,
                        viewMode: 1,
                        autoCropArea: 0.8
                    });
                };
                reader.readAsDataURL(file);
            }
        },
        saveImage() {
            if(!this.cropper) return;
            const canvas = this.cropper.getCroppedCanvas({ width: 200, height: 200 });
            const base64 = canvas.toDataURL('image/webp', 0.85);
            
            DB.data.user.avatar = base64;
            DB.save();
            document.getElementById('header-avatar').src = base64;
            this.closeModal();
        }
    },

    // --- UTILS ---
    editName() {
        const n = prompt("Nhập tên hiển thị mới:", DB.data.user.name);
        if(n) { DB.data.user.name = n; DB.save(); document.getElementById('user-display-name').innerText = n; }
    },
    saveSettings() {
        DB.data.settings.scale = document.getElementById('setting-scale').value;
        DB.save();
        App.refreshAll();
    },
    clearData() { DB.clear(); },
    exportData() {
        const blob = new Blob([JSON.stringify(DB.data)], {type: "application/json"});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `ScoreMaster_Backup_${Date.now()}.json`;
        a.click();
    },
    handleImport(e) {
        const file = e.target.files[0];
        if(!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try { DB.data = JSON.parse(ev.target.result); DB.save(); location.reload(); } 
            catch { alert("File không hợp lệ!"); }
        };
        reader.readAsText(file);
    },
    animateValue(id, start, end, duration) {
        if (start === end) return;
        const obj = document.getElementById(id);
        const range = end - start;
        let startTime = new Date().getTime();
        let endTime = startTime + duration;
        
        const run = () => {
            let now = new Date().getTime();
            let remaining = Math.max((endTime - now) / duration, 0);
            let val = end - (remaining * range);
            obj.innerHTML = val.toFixed(2);
            if (val == end) clearInterval(timer);
            else requestAnimationFrame(run);
        };
        run();
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());
