/**
 * CORE LOGIC
 * Contains: Configuration, Database Handling, Grading Algorithms
 */

const CONFIG = {
    DB_KEY: 'scoremaster_v2_db',
    THEME_KEY: 'sm_theme_v2'
};

const DB = {
    data: {
        user: { name: 'Sinh viên', avatar: null },
        settings: { scale: 'HUFLIT', goal: 3.6 },
        history: [], // { id, name, credits, score, type, date, folderId }
        folders: [], // { id, name, order, dateCreated }
        createdAt: Date.now()
    },
    load() {
        const saved = localStorage.getItem(CONFIG.DB_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                this.data = { ...this.data, ...parsed };
                // Migration: Ensure folders array exists if loading old data
                if (!this.data.folders) this.data.folders = [];
            } catch (e) { console.error("Data corrupted, resetting"); }
        }
    },
    save() {
        localStorage.setItem(CONFIG.DB_KEY, JSON.stringify(this.data));
    },
    clear() {
        if(confirm("Cảnh báo: Hành động này sẽ xóa toàn bộ dữ liệu vĩnh viễn!")) {
            localStorage.removeItem(CONFIG.DB_KEY);
            location.reload();
        }
    }
};

const Grading = {
    rules: {
        'HUFLIT': (s) => {
            if(s>=9.0) return {g: 'A+', p: 4.0}; if(s>=8.5) return {g: 'A', p: 4.0};
            if(s>=8.0) return {g: 'B+', p: 3.5}; if(s>=7.0) return {g: 'B', p: 3.0};
            if(s>=6.5) return {g: 'C+', p: 2.5}; if(s>=5.5) return {g: 'C', p: 2.0};
            if(s>=5.0) return {g: 'D+', p: 1.5}; if(s>=4.0) return {g: 'D', p: 1.0};
            return {g: 'F', p: 0.0};
        },
        'HUIT': (s) => {
            if(s>=8.5) return {g: 'A', p: 4.0}; if(s>=8.0) return {g: 'B+', p: 3.5};
            if(s>=7.0) return {g: 'B', p: 3.0}; if(s>=6.5) return {g: 'C+', p: 2.5};
            if(s>=5.5) return {g: 'C', p: 2.0}; if(s>=5.0) return {g: 'D+', p: 1.5};
            if(s>=4.0) return {g: 'D', p: 1.0}; return {g: 'F', p: 0.0};
        },
        'DEFAULT': (s) => {
             if(s>=8.5) return {g: 'A', p: 4.0}; if(s>=7.0) return {g: 'B', p: 3.0};
             if(s>=5.5) return {g: 'C', p: 2.0}; if(s>=4.0) return {g: 'D', p: 1.0};
             return {g: 'F', p: 0.0};
        }
    },
    calcSubject(inputs, ratio) {
        let weights = ratio === '100' ? [1] : ratio.split(':').map(Number);
        const sum = weights.reduce((a,b) => a+b, 0);
        weights = weights.map(w => w / sum);

        let total = 0;
        let valid = true;
        
        inputs.forEach((val, idx) => {
            let num = parseFloat(val);
            if(val === '' || isNaN(num) || num < 0 || num > 10) valid = false;
            total += num * weights[idx];
        });
        
        return valid ? Math.round(total * 100) / 100 : null;
    },
    getStats(history) {
        if (!history.length) return { gpa4: 0, gpa10: 0, credits: 0, pass: 0, fail: 0 };
        
        let totalP4 = 0, totalP10 = 0, totalCred = 0, pass = 0, fail = 0;
        const scale = DB.data.settings.scale || 'DEFAULT';
        const rule = Grading.rules[scale];

        history.forEach(h => {
            const sc = parseFloat(h.score);
            const cr = parseInt(h.credits);
            const info = rule(sc);
            
            totalP10 += sc * cr;
            totalP4 += info.p * cr;
            totalCred += cr;
            
            if(sc >= 4.0) pass++; else fail++;
        });

        const gpa4 = totalCred ? (totalP4 / totalCred).toFixed(2) : 0;
        return {
            gpa4,
            gpa10: totalCred ? (totalP10 / totalCred).toFixed(2) : 0,
            credits: totalCred, pass, fail,
            percent: (gpa4 / 4) * 100
        };
    }
};