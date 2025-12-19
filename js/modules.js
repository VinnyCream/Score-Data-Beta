/**
 * APP MODULES
 */

const GamificationModule = {
    // Cấu hình điểm EXP nhận được cho mỗi môn
    expTable: {
        'A+': 150, 'A': 130, 
        'B+': 110, 'B': 90, 
        'C+': 70,  'C': 50, 
        'D+': 30,  'D': 20, 
        'F': 5 // An ủi
    },

    calculate(history) {
        let totalExp = 0;
        const scale = DB.data.settings.scale || 'DEFAULT';
        
        history.forEach(h => {
            const score = parseFloat(h.score);
            const info = Grading.rules[scale](score);
            // Lấy điểm chữ cái đầu tiên (vd A+ -> A) để tra bảng nếu cần, hoặc dùng key chính xác
            // Ở đây Grading.rules trả về 'A+', 'B'... khớp với key expTable
            if (this.expTable[info.g]) {
                totalExp += this.expTable[info.g];
            } else {
                // Fallback nếu không khớp key (vd lấy ký tự đầu)
                const char = info.g.charAt(0); 
                const fallbackKey = char + (info.g.includes('+') ? '+' : '');
                totalExp += this.expTable[fallbackKey] || 10;
            }
        });

        // Tính Level: Mỗi 500 EXP lên 1 cấp
        const level = Math.floor(totalExp / 500) + 1;
        
        // Tính tiến độ Level hiện tại (%)
        const currentLevelExp = totalExp % 500;
        const progressPercent = (currentLevelExp / 500) * 100;

        return { totalExp, level, progressPercent };
    },

    getTitle(gpa) {
        if (gpa >= 3.6) return "Học Bá Truyền Thuyết";
        if (gpa >= 3.2) return "Học Bá Chăm Chỉ";
        if (gpa >= 2.8) return "Chiến Thần Qua Môn";
        if (gpa >= 2.5) return "Sinh Viên Tiềm Năng";
        if (gpa >= 2.0) return "Tân Binh Đại Học";
        return "Cần Nỗ Lực Hơn";
    },
    
    getLevelName(level) {
        if(level >= 50) return "Giáo Sư";
        if(level >= 30) return "Tiến Sĩ";
        if(level >= 20) return "Thạc Sĩ";
        if(level >= 10) return "Cử Nhân";
        if(level >= 5) return "Đại Học";
        return "Tân Thủ";
    }
};

// ... (Giữ nguyên các module Theme, History, Analytics, Profile cũ ở đây) ...
const ThemeModule = {
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
                document.body.removeAttribute('data-theme'); localStorage.setItem(CONFIG.THEME_KEY, 'light'); if(switchInput) switchInput.checked = false;
            } else {
                document.body.setAttribute('data-theme', 'dark'); localStorage.setItem(CONFIG.THEME_KEY, 'dark'); if(switchInput) switchInput.checked = true;
            }
            if(App && App.renderDashboard) App.renderDashboard(); 
        };
        if(toggleBtn) toggleBtn.onclick = toggleLogic;
        if(switchInput) switchInput.onchange = toggleLogic;
    }
};

const HistoryModule = {
    state: { currentFolderId: null, search: '', filter: 'all', page: 1, perPage: 10, selectionMode: false, selectedIds: new Set() },
    setSearch(val) { this.state.search = val; this.state.page = 1; this.render(); },
    setFilter(val) { this.state.filter = val; this.state.page = 1; this.render(); },
    changePage(dir) { this.state.page += dir; this.render(); },
    goRoot() { this.state.currentFolderId = null; this.state.page = 1; this.state.selectionMode = false; this.state.selectedIds.clear(); this.render(); },
    enterFolder(id) { this.state.currentFolderId = id; this.state.page = 1; this.state.selectionMode = false; this.state.selectedIds.clear(); this.render(); },
    toggleSelectionMode() { this.state.selectionMode = !this.state.selectionMode; if(!this.state.selectionMode) this.state.selectedIds.clear(); this.render(); },
    selectItem(id) { if(this.state.selectedIds.has(id)) this.state.selectedIds.delete(id); else this.state.selectedIds.add(id); this.render(); },
    render() {
        const list = document.getElementById('history-list'); list.innerHTML = '';
        let items = DB.data.history.filter(h => h.folderId === this.state.currentFolderId);
        let folders = DB.data.folders.filter(f => this.state.currentFolderId === null);
        if(this.state.currentFolderId) { folders = []; const folderName = DB.data.folders.find(f => f.id === this.state.currentFolderId)?.name || 'Unknown'; document.getElementById('history-breadcrumb').style.display = 'flex'; document.getElementById('crumb-folder-name').innerText = folderName; } else { document.getElementById('history-breadcrumb').style.display = 'none'; }
        if(this.state.search) { const s = this.state.search.toLowerCase(); items = items.filter(i => i.name.toLowerCase().includes(s)); folders = folders.filter(f => f.name.toLowerCase().includes(s)); }
        if(this.state.filter === 'pass') items = items.filter(i => i.score >= 4.0); if(this.state.filter === 'fail') items = items.filter(i => i.score < 4.0);
        folders.sort((a,b) => (a.order || 0) - (b.order || 0)); items.sort((a,b) => b.date - a.date);
        const combined = [...folders.map(f => ({...f, type: 'folder'})), ...items.map(i => ({...i, type: 'item'}))];
        const totalPages = Math.ceil(combined.length / this.state.perPage) || 1;
        if(this.state.page > totalPages) this.state.page = totalPages; if(this.state.page < 1) this.state.page = 1;
        const viewData = combined.slice((this.state.page - 1) * this.state.perPage, this.state.page * this.state.perPage);
        document.getElementById('page-info').innerText = `${this.state.page} / ${totalPages}`;
        document.getElementById('prev-page').disabled = this.state.page === 1; document.getElementById('next-page').disabled = this.state.page === totalPages;
        const actionbar = document.getElementById('history-actions'); const trigger = document.getElementById('select-trigger-container');
        if(this.state.selectionMode) { actionbar.classList.remove('hidden'); trigger.style.display = 'none'; document.getElementById('select-count').innerText = `${this.state.selectedIds.size} đã chọn`; } else { actionbar.classList.add('hidden'); trigger.style.display = 'flex'; }
        if(viewData.length === 0) { list.innerHTML = `<div style="text-align:center; padding:30px; color:var(--text-sec); opacity:0.7">Trống</div>`; return; }
        const scale = DB.data.settings.scale || 'DEFAULT';
        viewData.forEach(obj => {
            if(obj.type === 'folder') {
                const el = document.createElement('div'); el.className = 'folder-item'; el.draggable = !this.state.selectionMode; el.dataset.id = obj.id;
                el.addEventListener('dragstart', this.handleDragStart); el.addEventListener('dragover', this.handleDragOver); el.addEventListener('drop', this.handleDrop); el.addEventListener('dragend', this.handleDragEnd);
                el.innerHTML = `<div class="folder-icon"><span class="material-symbols-rounded">folder</span></div><div class="folder-info" onclick="App.History.enterFolder('${obj.id}')"><div class="folder-name">${obj.name}</div><div class="folder-meta">Thư mục</div></div><div class="folder-actions"><button class="btn-text" onclick="App.History.renameFolder('${obj.id}', '${obj.name}')"><span class="material-symbols-rounded">edit</span></button><button class="btn-text" style="color:var(--danger)" onclick="App.History.deleteFolder('${obj.id}')"><span class="material-symbols-rounded">delete</span></button></div>`;
                list.appendChild(el);
            } else {
                const isPass = obj.score >= 4.0; const info = Grading.rules[scale](parseFloat(obj.score)); const isSelected = this.state.selectedIds.has(obj.id);
                const el = document.createElement('div'); el.className = 'history-item';
                el.innerHTML = `${this.state.selectionMode ? `<div class="select-checkbox ${isSelected?'checked':''}" onclick="App.History.selectItem(${obj.id})"><span class="material-symbols-rounded">check</span></div>` : ''}<div class="h-info" onclick="${this.state.selectionMode ? `App.History.selectItem(${obj.id})` : ''}"><h4>${obj.name}</h4><span class="h-meta">${obj.credits} tín chỉ • ${new Date(obj.date).toLocaleDateString()}</span></div><div style="display:flex; gap:12px; align-items:center;"><div class="h-grade-box ${isPass ? 'grade-pass' : 'grade-fail'}">${info.g}</div>${!this.state.selectionMode ? `<button class="btn-text" style="color:var(--danger); padding:5px" onclick="App.History.deleteItem(${obj.id})"><span class="material-symbols-rounded">delete</span></button>` : ''}</div>`;
                list.appendChild(el);
            }
        });
    },
    createNewFolderEmpty() { const name = prompt("Tên thư mục mới:", "Học kỳ mới"); if(name) { DB.data.folders.push({ id: 'f_' + Date.now(), name, order: DB.data.folders.length, dateCreated: Date.now() }); DB.save(); this.render(); } },
    createFolderFromSelection() { if(this.state.selectedIds.size === 0) return alert("Chưa chọn mục nào!"); const name = prompt("Tên thư mục mới cho các mục đã chọn:"); if(!name) return; const newId = 'f_' + Date.now(); DB.data.folders.push({ id: newId, name, order: DB.data.folders.length, dateCreated: Date.now() }); DB.data.history.forEach(h => { if(this.state.selectedIds.has(h.id)) h.folderId = newId; }); DB.save(); this.state.selectionMode = false; this.state.selectedIds.clear(); this.render(); },
    renameFolder(id, oldName) { const newName = prompt("Đổi tên thư mục:", oldName); if(newName && newName !== oldName) { const f = DB.data.folders.find(x => x.id === id); if(f) f.name = newName; DB.save(); this.render(); } },
    deleteFolder(id) { if(confirm("Xóa thư mục này? Các môn học bên trong sẽ được đưa ra ngoài.")) { DB.data.history.forEach(h => { if(h.folderId === id) h.folderId = null; }); DB.data.folders = DB.data.folders.filter(f => f.id !== id); DB.save(); this.render(); } },
    deleteItem(id) { if(confirm("Xóa môn học này?")) { DB.data.history = DB.data.history.filter(h => h.id !== id); DB.save(); App.refreshAll(); } },
    deleteSelected() { if(confirm(`Xóa ${this.state.selectedIds.size} mục đã chọn?`)) { DB.data.history = DB.data.history.filter(h => !this.state.selectedIds.has(h.id)); DB.save(); this.state.selectionMode = false; this.state.selectedIds.clear(); App.refreshAll(); } },
    dragSrcEl: null,
    handleDragStart(e) { this.style.opacity = '0.4'; App.History.dragSrcEl = this; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/html', this.innerHTML); this.classList.add('dragging'); },
    handleDragOver(e) { if (e.preventDefault) e.preventDefault(); e.dataTransfer.dropEffect = 'move'; return false; },
    handleDrop(e) { if (e.stopPropagation) e.stopPropagation(); const srcEl = App.History.dragSrcEl; if (srcEl !== this && this.classList.contains('folder-item')) { const srcIdx = DB.data.folders.findIndex(f => f.id === srcEl.dataset.id); const targetIdx = DB.data.folders.findIndex(f => f.id === this.dataset.id); const tempOrder = DB.data.folders[srcIdx].order; DB.data.folders[srcIdx].order = DB.data.folders[targetIdx].order; DB.data.folders[targetIdx].order = tempOrder; DB.save(); App.History.render(); } return false; },
    handleDragEnd(e) { this.style.opacity = '1'; this.classList.remove('dragging'); }
};

const AnalyticsModule = {
    setGoal() { const g = parseFloat(document.getElementById('goal-gpa').value); if(g > 0 && g <= 4.0) { DB.data.settings.goal = g; DB.save(); this.checkGoal(); } },
    checkGoal() { const current = parseFloat(document.getElementById('dash-gpa-4').innerText); const goal = DB.data.settings.goal || 3.6; const msg = document.getElementById('goal-message'); if(current >= goal) { msg.innerText = "🎉 Tuyệt vời! Bạn đã đạt mục tiêu!"; msg.style.color = "var(--success)"; } else { msg.innerText = `Cần cố gắng thêm ${(goal - current).toFixed(2)} điểm nữa.`; msg.style.color = "var(--text-sec)"; } },
    drawRadar() {
        const ctx = document.getElementById('radarChart').getContext('2d'); const scale = DB.data.settings.scale || 'DEFAULT'; const counts = { 'A/A+':0, 'B/B+':0, 'C/C+':0, 'D/D+':0, 'F':0 };
        DB.data.history.forEach(h => { const g = Grading.rules[scale](parseFloat(h.score)).g; if(g.includes('A')) counts['A/A+']++; else if(g.includes('B')) counts['B/B+']++; else if(g.includes('C')) counts['C/C+']++; else if(g.includes('D')) counts['D/D+']++; else counts['F']++; });
        if(App.charts.radar) App.charts.radar.destroy();
        const isDark = document.body.getAttribute('data-theme') === 'dark'; const gridColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
        App.charts.radar = new Chart(ctx, { type: 'radar', data: { labels: Object.keys(counts), datasets: [{ label: 'Phân bố', data: Object.values(counts), backgroundColor: 'rgba(108, 92, 231, 0.3)', borderColor: '#6c5ce7', pointBackgroundColor: '#a29bfe' }] }, options: { responsive: true, maintainAspectRatio: false, scales: { r: { suggestMin: 0, ticks: { display: false }, grid: { color: gridColor }, angleLines: { color: gridColor } } }, plugins: { legend: { display: false } } } });
    }
};

const ProfileModule = {
    cropper: null,
    
    // Kích hoạt input file ẩn
    triggerUpload() { 
        document.getElementById('file-upload').click(); 
    },

    // Mở modal: Bỏ class hidden
    openModal() { 
        const overlay = document.getElementById('crop-modal-overlay');
        overlay.classList.remove('hidden'); 
    },

    // Đóng modal: Thêm class hidden và dọn dẹp Cropper
    closeModal() { 
        const overlay = document.getElementById('crop-modal-overlay');
        overlay.classList.add('hidden'); 
        
        if(this.cropper) { 
            this.cropper.destroy(); 
            this.cropper = null; 
        } 
        // Reset input để có thể chọn lại cùng 1 file nếu hủy
        document.getElementById('file-upload').value = ''; 
    },

    handleFileSelect(e) { 
        const file = e.target.files[0]; 
        if(!file) return; 

        // Nếu là GIF: Lưu thẳng (vì thư viện crop không hỗ trợ crop ảnh động tốt)
        if(file.type === 'image/gif') { 
            const reader = new FileReader(); 
            reader.onload = (evt) => { 
                if(evt.target.result.length > 3000000) return alert("File GIF quá lớn (>3MB)."); 
                DB.data.user.avatar = evt.target.result; 
                DB.save(); 
                App.updateAvatars(evt.target.result); 
                // Không cần mở modal
            }; 
            reader.readAsDataURL(file); 
        } else { 
            // Nếu là ảnh tĩnh (JPG, PNG): Mở modal Crop
            const reader = new FileReader(); 
            reader.onload = (evt) => { 
                const img = document.getElementById('image-to-crop');
                img.src = evt.target.result; 
                
                App.Profile.openModal(); // Hiển thị modal trước
                
                // Khởi tạo Cropper sau khi ảnh đã load vào src
                if(App.Profile.cropper) App.Profile.cropper.destroy(); 
                
                // Đợi 1 chút để DOM cập nhật modal hiển thị
                setTimeout(() => {
                    App.Profile.cropper = new Cropper(img, { 
                        aspectRatio: 1, 
                        viewMode: 1, 
                        autoCropArea: 0.9,
                        dragMode: 'move',
                        guides: false
                    }); 
                }, 100);
            }; 
            reader.readAsDataURL(file); 
        } 
    },

    saveImage() { 
        if(!this.cropper) return; 
        // Lấy ảnh đã crop
        const canvas = this.cropper.getCroppedCanvas({ 
            width: 300, 
            height: 300,
            imageSmoothingEnabled: true,
            imageSmoothingQuality: 'high'
        }); 
        
        // Chuyển sang base64
        const base64 = canvas.toDataURL('image/webp', 0.9); 
        
        // Lưu và cập nhật
        DB.data.user.avatar = base64; 
        DB.save(); 
        App.updateAvatars(base64); 
        this.closeModal(); 
    }
};