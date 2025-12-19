/**
 * APP MAIN CONTROLLER
 */

const App = {
    charts: {},
    Theme: ThemeModule,
    History: HistoryModule,
    Analytics: AnalyticsModule,
    Profile: ProfileModule,
    Gamification: GamificationModule,

    init() {
        DB.load();
        this.Theme.init();
        this.setupUI();
        this.bindEvents();
        this.runIntro();
    },

    runIntro() {
        const text = ":Device/LocalStorage/Score-Data...";
        const typingEl = document.getElementById('typing-text');
        let i = 0;
        const type = () => {
            if (i < text.length) { typingEl.innerHTML += text.charAt(i); i++; setTimeout(type, 50); } 
            else { setTimeout(() => { const intro = document.getElementById('intro-layer'); intro.style.opacity = '0'; setTimeout(() => intro.remove(), 600); }, 1200); }
        };
        setTimeout(type, 300);
    },

    setupUI() {
        // Update user info
        document.getElementById('user-display-name').innerText = DB.data.user.name;
        document.getElementById('hero-name').innerText = DB.data.user.name;
        
        if(DB.data.user.avatar) {
            this.updateAvatars(DB.data.user.avatar);
        }
        
        document.getElementById('setting-scale').value = DB.data.settings.scale;
        this.renderInputs('5:5');
        this.refreshAll();
    },
    
    updateAvatars(src) {
        document.getElementById('header-avatar').src = src;
        document.getElementById('hero-avatar').src = src;
    },

    refreshAll() {
        this.renderDashboard();
        this.History.render();
        this.renderAnalytics();
    },

    bindEvents() {
        // Nav
        document.querySelectorAll('.nav-item, .m-nav-item').forEach(btn => {
            if(btn.classList.contains('center-fab')) return; 
            btn.onclick = () => {
                if(navigator.vibrate) navigator.vibrate(40);
                App.navigateTo(btn.dataset.target);
            };
        });
        // Calc
        document.getElementById('weight-select').onchange = (e) => App.renderInputs(e.target.value);
        document.getElementById('btn-reset-calc').onclick = () => {
            if(navigator.vibrate) navigator.vibrate(20);
            document.querySelectorAll('#dynamic-scores input').forEach(i => i.value = '');
            document.getElementById('subject-name').value = '';
        };
        document.getElementById('btn-calc').onclick = App.handleCalculate;
        document.getElementById('btn-save-result').onclick = App.handleSaveResult;
        // Filters
        document.getElementById('search-history').onkeyup = (e) => App.History.setSearch(e.target.value);
        document.querySelectorAll('.tab').forEach(t => {
            t.onclick = () => {
                if(navigator.vibrate) navigator.vibrate(20);
                document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
                t.classList.add('active'); App.History.setFilter(t.dataset.filter);
            }
        });
        // Files
        document.getElementById('import-file').onchange = App.handleImport;
        document.getElementById('file-upload').onchange = App.Profile.handleFileSelect;
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

    renderInputs(ratio) {
        const container = document.getElementById('dynamic-scores');
        container.innerHTML = '';
        const labels = {
            '5:5': ['Quá trình (50%)', 'Cuối kỳ (50%)'], '4:6': ['Quá trình (40%)', 'Cuối kỳ (60%)'],
            '3:7': ['Quá trình (30%)', 'Cuối kỳ (70%)'], '2:3:5': ['CC (20%)', 'GK (30%)', 'CK (50%)'],
            '100': ['Điểm tổng kết (100%)']
        };
        labels[ratio].forEach(lbl => {
            const div = document.createElement('div'); div.className = 'form-group';
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
        const currentFolder = App.History.state.currentFolderId;
        DB.data.history.unshift({ id: Date.now(), name, credits, score: score10, type: ratio, date: Date.now(), folderId: currentFolder });
        DB.save();
        document.getElementById('result-modal').close();
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
        App.refreshAll(); document.getElementById('btn-reset-calc').click();
    },

    renderDashboard() {
        const stats = Grading.getStats(DB.data.history);
        const gameStats = App.Gamification.calculate(DB.data.history);
        const title = App.Gamification.getTitle(parseFloat(stats.gpa4));
        const levelName = App.Gamification.getLevelName(gameStats.level);

        // Update Stats
        App.animateValue('dash-gpa-4', parseFloat(document.getElementById('dash-gpa-4').innerText), stats.gpa4, 1000);
        document.getElementById('dash-pass').innerText = stats.pass;
        document.getElementById('dash-fail').innerText = stats.fail;
        document.getElementById('dash-credits').innerText = stats.credits;
        document.getElementById('gpa-percent').innerText = Math.round(stats.percent) + '%';
        
        // Update Circle Ring
        const circle = document.getElementById('gpa-circle-stroke');
        circle.style.strokeDasharray = `${stats.percent}, 100`;

        // Update Rank & Game Stats
        let rank = "Chưa xếp loại";
        if(stats.gpa4 >= 3.6) rank = "Xuất sắc";
        else if(stats.gpa4 >= 3.2) rank = "Giỏi";
        else if(stats.gpa4 >= 2.5) rank = "Khá";
        else if(stats.gpa4 >= 2.0) rank = "Trung bình";
        else if(stats.credits > 0) rank = "Yếu";
        
        document.getElementById('gpa-rank').innerText = rank;
        
        // Hero Profile Updates
        document.getElementById('hero-level-badge').innerText = `Lv.${gameStats.level}`;
        document.getElementById('hero-level-text').innerText = `Level ${gameStats.level} (${levelName})`;
        document.getElementById('hero-title').innerText = `Danh hiệu: ${title}`;

        App.drawDashboardChart();
    },

    drawDashboardChart() {
        // Sử dụng Line Chart dạng sóng như hình mẫu thay vì Bar Chart
        const ctx = document.getElementById('dashboardChart').getContext('2d');
        
        // Lấy 6 môn gần nhất để vẽ cho đẹp, hoặc lấy theo nhóm điểm
        // Ở đây ta vẽ phân bố điểm (số lượng môn đạt điểm A, B, C...)
        const dist = {A:0, B:0, C:0, D:0, F:0};
        const scale = DB.data.settings.scale || 'DEFAULT';
        
        DB.data.history.forEach(h => {
            const g = Grading.rules[scale](parseFloat(h.score)).g.charAt(0);
            if(dist[g] !== undefined) dist[g]++; else dist.F++;
        });

        // Map data to array for chart
        const labels = ['F', 'D', 'C', 'B', 'A'];
        const dataPoints = [dist.F, dist.D, dist.C, dist.B, dist.A];

        if(App.charts.bar) App.charts.bar.destroy();
        
        // Gradient Fill
        const gradient = ctx.createLinearGradient(0, 0, 0, 200);
        gradient.addColorStop(0, 'rgba(0, 206, 201, 0.5)'); // Accent color
        gradient.addColorStop(1, 'rgba(0, 206, 201, 0.0)');

        App.charts.bar = new Chart(ctx, {
            type: 'line', // Chuyển sang Line
            data: {
                labels: labels,
                datasets: [{
                    label: 'Số môn',
                    data: dataPoints,
                    borderColor: '#00cec9',
                    backgroundColor: gradient,
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4, // Tạo đường cong mềm mại (Wave)
                    pointRadius: 4,
                    pointBackgroundColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, display: true, grid: { color: 'rgba(255,255,255,0.05)' } },
                    x: { grid: { display: false }, ticks: { color: '#b2bec3' } }
                }
            }
        });
    },

    renderAnalytics() {
        const h = DB.data.history;
        if(!h.length) return;
        const total = h.reduce((a,b) => a + parseFloat(b.score), 0);
        document.getElementById('insight-avg-10').innerText = (total / h.length).toFixed(2);
        const best = h.reduce((p,c) => parseFloat(p.score) > parseFloat(c.score) ? p : c);
        document.getElementById('insight-best-subject').innerText = `${best.name} (${best.score})`;
        App.Analytics.checkGoal();
        App.Analytics.drawRadar();
    },

    editName() {
        const n = prompt("Nhập tên hiển thị mới:", DB.data.user.name);
        if(n) { 
            DB.data.user.name = n; DB.save(); 
            document.getElementById('user-display-name').innerText = n;
            document.getElementById('hero-name').innerText = n;
        }
    },
    saveSettings() {
        DB.data.settings.scale = document.getElementById('setting-scale').value;
        DB.save(); App.refreshAll();
    },
    clearData() { DB.clear(); },
    exportData() {
        const blob = new Blob([JSON.stringify(DB.data)], {type: "application/json"});
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `ScoreMaster_Backup_${Date.now()}.json`; a.click();
    },
    handleImport(e) {
        const file = e.target.files[0]; if(!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => { try { DB.data = JSON.parse(ev.target.result); DB.save(); location.reload(); } catch { alert("File không hợp lệ!"); } };
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