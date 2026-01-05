/**
 * Missions Page - With Quiz System
 */
Pages.Missions = {
    missions: [],
    activeFilter: '',
    quizData: null,

    // Pre-defined quiz questions for different topics
    quizBank: {
        programming: [
            { q: "Apa kepanjangan dari HTML?", options: ["Hyper Text Markup Language", "High Text Machine Language", "Hyperlink Text Mark Language", "Home Tool Markup Language"], answer: 0 },
            { q: "Bahasa pemrograman mana yang digunakan untuk styling halaman web?", options: ["JavaScript", "Python", "CSS", "Java"], answer: 2 },
            { q: "Apa fungsi dari JavaScript?", options: ["Membuat database", "Menambah interaktivitas web", "Styling halaman", "Membuat server"], answer: 1 },
            { q: "Framework JavaScript mana yang dikembangkan oleh Facebook?", options: ["Angular", "Vue", "React", "jQuery"], answer: 2 },
            { q: "Apa itu API?", options: ["Application Program Interface", "Advanced Programming Interface", "Application Process Integration", "Automated Program Input"], answer: 0 }
        ],
        database: [
            { q: "SQL adalah singkatan dari?", options: ["Structured Query Language", "Simple Query Language", "Standard Question Language", "System Query Logic"], answer: 0 },
            { q: "Perintah SQL untuk mengambil data adalah?", options: ["GET", "FETCH", "SELECT", "RETRIEVE"], answer: 2 },
            { q: "Apa fungsi PRIMARY KEY dalam database?", options: ["Enkripsi data", "Identifikasi unik record", "Password database", "Backup data"], answer: 1 },
            { q: "Database NoSQL yang populer adalah?", options: ["MySQL", "PostgreSQL", "MongoDB", "Oracle"], answer: 2 },
            { q: "JOIN dalam SQL digunakan untuk?", options: ["Menggabungkan tabel", "Menghapus data", "Membuat tabel", "Update data"], answer: 0 }
        ],
        general: [
            { q: "Siapa penemu World Wide Web?", options: ["Bill Gates", "Steve Jobs", "Tim Berners-Lee", "Mark Zuckerberg"], answer: 2 },
            { q: "Apa kepanjangan dari CPU?", options: ["Central Processing Unit", "Computer Personal Unit", "Central Program Utility", "Core Processing Unit"], answer: 0 },
            { q: "Berapa bit dalam 1 byte?", options: ["4", "8", "16", "32"], answer: 1 },
            { q: "OS yang dikembangkan oleh Google adalah?", options: ["iOS", "Windows", "Android", "macOS"], answer: 2 },
            { q: "Apa itu Cloud Computing?", options: ["Cuaca di internet", "Komputasi berbasis awan/online", "Software cuaca", "Jenis komputer"], answer: 1 }
        ],
        math: [
            { q: "Berapa hasil dari 15 × 7?", options: ["95", "105", "115", "85"], answer: 1 },
            { q: "Jika x + 5 = 12, maka x = ?", options: ["5", "6", "7", "8"], answer: 2 },
            { q: "Berapa akar kuadrat dari 144?", options: ["10", "11", "12", "14"], answer: 2 },
            { q: "Berapakah 2³?", options: ["6", "8", "9", "12"], answer: 1 },
            { q: "Keliling lingkaran dengan r=7 adalah? (π=22/7)", options: ["22", "44", "66", "88"], answer: 1 }
        ]
    },

    // Daily/Weekly quiz templates
    systemMissions: {
        daily: [
            { title: "Quiz Harian: Pemrograman", topic: "programming", reward: 500, questions: 3 },
            { title: "Quiz Harian: Database", topic: "database", reward: 500, questions: 3 },
            { title: "Quiz Harian: Pengetahuan IT", topic: "general", reward: 500, questions: 3 }
        ],
        weekly: [
            { title: "Quiz Mingguan: Pemrograman Dasar", topic: "programming", reward: 2000, questions: 5 },
            { title: "Quiz Mingguan: Database & SQL", topic: "database", reward: 2000, questions: 5 },
            { title: "Quiz Mingguan: Matematika Dasar", topic: "math", reward: 1500, questions: 5 }
        ]
    },

    async render() {
        const app = document.getElementById('app');

        app.innerHTML = `
            <div class="page" style="padding-bottom: 100px;">
                ${Components.pageHeader('Quiz', false, '')}
                
                <div class="flex gap-sm mb-lg" style="overflow-x: auto; padding-bottom: 8px;">
                    <button class="btn btn-sm ${!this.activeFilter ? 'btn-primary' : 'btn-secondary'}" onclick="Pages.Missions.filterMissions('')">
                        Semua
                    </button>
                    <button class="btn btn-sm ${this.activeFilter === 'daily' ? 'btn-primary' : 'btn-secondary'}" onclick="Pages.Missions.filterMissions('daily')">
                        Harian
                    </button>
                    <button class="btn btn-sm ${this.activeFilter === 'weekly' ? 'btn-primary' : 'btn-secondary'}" onclick="Pages.Missions.filterMissions('weekly')">
                        Mingguan
                    </button>
                </div>
                
                <!-- System Quizzes Section -->
                <div id="system-quizzes" class="mb-lg">
                    ${Components.sectionHeader('📝 Quiz Tersedia', '', '')}
                    <div id="quiz-list"></div>
                </div>
            </div>
            ${Components.tabBar('missions')}
        `;

        Components.setupTabBar();
        this.renderSystemQuizzes();
    },

    filterMissions(type) {
        this.activeFilter = type;
        this.render();
    },

    renderSystemQuizzes() {
        const container = document.getElementById('quiz-list');

        // Get today's daily quiz and this week's weekly quiz
        const dayIndex = new Date().getDay();
        const dailyQuiz = this.systemMissions.daily[dayIndex % this.systemMissions.daily.length];
        const weekIndex = Math.floor(new Date().getDate() / 7);
        const weeklyQuiz = this.systemMissions.weekly[weekIndex % this.systemMissions.weekly.length];

        // Check if filtered
        let quizzes = [];
        if (!this.activeFilter || this.activeFilter === 'quiz' || this.activeFilter === 'daily') {
            quizzes.push({ ...dailyQuiz, type: 'daily', id: 'daily-' + dayIndex });
        }
        if (!this.activeFilter || this.activeFilter === 'quiz' || this.activeFilter === 'weekly') {
            quizzes.push({ ...weeklyQuiz, type: 'weekly', id: 'weekly-' + weekIndex });
        }

        if (quizzes.length === 0) {
            container.innerHTML = '<p class="text-muted text-center">Tidak ada quiz untuk filter ini</p>';
            return;
        }

        // Check completed quizzes from localStorage
        const completedQuizzes = Utils.storage.get('wp_completed_quizzes') || [];

        container.innerHTML = quizzes.map(quiz => {
            const isCompleted = completedQuizzes.includes(quiz.id);

            return `
                <div class="card mb-md" style="border-left: 4px solid ${quiz.type === 'daily' ? 'var(--primary)' : 'var(--secondary)'};">
                    <div class="flex justify-between items-start mb-sm">
                        <div>
                            <span class="badge ${quiz.type === 'daily' ? 'badge-primary' : 'badge-warning'}" style="margin-bottom: 8px;">
                                ${quiz.type === 'daily' ? '📅 Harian' : '📆 Mingguan'}
                            </span>
                            <h4>${Utils.escapeHtml(quiz.title)}</h4>
                        </div>
                        <div class="text-right">
                            <div style="font-size: 18px; font-weight: 700; color: var(--accent);">
                                +${Utils.formatCurrency(quiz.reward)}
                            </div>
                        </div>
                    </div>
                    <p class="text-muted mb-md" style="font-size: 13px;">
                        <i class="fas fa-question-circle"></i> ${quiz.questions} pertanyaan • 
                        <i class="fas fa-clock"></i> ${quiz.questions * 30} detik
                    </p>
                    ${isCompleted ? `
                        <div class="badge badge-success">
                            <i class="fas fa-check"></i> Sudah Dikerjakan
                        </div>
                    ` : `
                        <button class="btn btn-primary btn-sm" onclick="Pages.Missions.startQuiz('${quiz.id}', '${quiz.topic}', ${quiz.questions}, ${quiz.reward}, '${quiz.title}')">
                            <i class="fas fa-play"></i> Mulai Quiz
                        </button>
                    `}
                </div>
            `;
        }).join('');
    },

    startQuiz(quizId, topic, numQuestions, reward, title) {
        // Get random questions from quiz bank
        const allQuestions = this.quizBank[topic] || this.quizBank.general;
        const shuffled = [...allQuestions].sort(() => Math.random() - 0.5);
        const questions = shuffled.slice(0, numQuestions);

        this.quizData = {
            id: quizId,
            title,
            questions,
            reward,
            currentIndex: 0,
            score: 0,
            startTime: Date.now()
        };

        this.showQuizQuestion();
    },

    showQuizQuestion() {
        const { questions, currentIndex, title, score } = this.quizData;
        const question = questions[currentIndex];

        // Create or update quiz modal
        let overlay = document.querySelector('.quiz-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'modal-overlay active quiz-overlay';
            document.body.appendChild(overlay);
        }

        overlay.innerHTML = `
            <div class="modal" style="max-width: 450px;">
                <div class="modal-header">
                    <h3 class="modal-title">${Utils.escapeHtml(title)}</h3>
                    <span class="text-muted">
                        ${currentIndex + 1}/${questions.length}
                    </span>
                </div>
                
                <div class="mb-md">
                    <div class="mission-progress-bar" style="height: 6px;">
                        <div class="mission-progress-fill" style="width: ${((currentIndex) / questions.length) * 100}%;"></div>
                    </div>
                </div>
                
                <div class="card mb-lg" style="background: linear-gradient(135deg, rgba(0,212,255,0.1), rgba(124,58,237,0.1));">
                    <h3 style="font-size: 18px; line-height: 1.5;">${Utils.escapeHtml(question.q)}</h3>
                </div>
                
                <div class="quiz-options">
                    ${question.options.map((opt, idx) => `
                        <button class="btn btn-secondary btn-block mb-sm quiz-option" 
                                style="text-align: left; justify-content: flex-start;" 
                                onclick="Pages.Missions.answerQuestion(${idx})">
                            <span style="width: 28px; height: 28px; background: var(--bg-card); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 12px; font-weight: 600;">
                                ${String.fromCharCode(65 + idx)}
                            </span>
                            ${Utils.escapeHtml(opt)}
                        </button>
                    `).join('')}
                </div>
                
                <div class="flex justify-between items-center mt-lg text-muted" style="font-size: 13px;">
                    <span><i class="fas fa-check-circle"></i> Benar: ${score}</span>
                    <span><i class="fas fa-clock"></i> ${Math.floor((Date.now() - this.quizData.startTime) / 1000)}s</span>
                </div>
            </div>
        `;
    },

    answerQuestion(selectedIndex) {
        const { questions, currentIndex, reward } = this.quizData;
        const question = questions[currentIndex];
        const isCorrect = selectedIndex === question.answer;

        if (isCorrect) {
            this.quizData.score++;
        }

        // Show feedback
        const options = document.querySelectorAll('.quiz-option');
        options.forEach((opt, idx) => {
            opt.disabled = true;
            if (idx === question.answer) {
                opt.style.background = 'rgba(16, 185, 129, 0.3)';
                opt.style.borderColor = 'var(--success)';
            } else if (idx === selectedIndex && !isCorrect) {
                opt.style.background = 'rgba(239, 68, 68, 0.3)';
                opt.style.borderColor = 'var(--danger)';
            }
        });

        // Move to next question after delay
        setTimeout(() => {
            this.quizData.currentIndex++;

            if (this.quizData.currentIndex >= questions.length) {
                this.finishQuiz();
            } else {
                this.showQuizQuestion();
            }
        }, 1000);
    },

    async finishQuiz() {
        const { id, title, questions, score, reward, startTime } = this.quizData;
        const timeTaken = Math.floor((Date.now() - startTime) / 1000);
        const totalQuestions = questions.length;
        const wrongAnswers = totalQuestions - score;
        const percentage = (score / totalQuestions) * 100;
        const isPassed = percentage >= 60; // 60% to pass

        // Calculate earned reward based on score
        // Perfect score = 100% reward
        // Each wrong answer reduces reward
        // Formula: reward * (score / total) with minimum 60% to get any reward
        let earnedReward = 0;
        let rewardPercentage = 0;

        if (isPassed) {
            // Calculate reward percentage based on score
            // 60% = 60% reward, 100% = 100% reward
            rewardPercentage = Math.round(percentage);
            earnedReward = Math.round(reward * (percentage / 100));
        }

        // Save completed quiz
        const completedQuizzes = Utils.storage.get('wp_completed_quizzes') || [];
        if (!completedQuizzes.includes(id)) {
            completedQuizzes.push(id);
            Utils.storage.set('wp_completed_quizzes', completedQuizzes);
        }

        // If passed, try to add reward via API
        if (isPassed && earnedReward > 0) {
            try {
                // Credit points via a dummy mission claim or direct wallet credit
                await Api.request('/wallet/quiz-reward', {
                    method: 'POST',
                    body: {
                        quiz_id: id,
                        score: score,
                        total: totalQuestions,
                        reward: earnedReward
                    }
                });
            } catch (e) {
                // API might not have this endpoint yet, just proceed
                console.log('Quiz reward API not available:', e);
            }
        }

        // Show result
        const overlay = document.querySelector('.quiz-overlay');

        // Create performance message
        let performanceMessage = '';
        let performanceIcon = '';

        if (percentage === 100) {
            performanceMessage = 'Sempurna! Semua jawaban benar!';
            performanceIcon = '🏆';
        } else if (percentage >= 80) {
            performanceMessage = 'Luar biasa! Hampir sempurna!';
            performanceIcon = '🌟';
        } else if (percentage >= 60) {
            performanceMessage = 'Bagus! Kamu lulus quiz ini.';
            performanceIcon = '✅';
        } else if (percentage >= 40) {
            performanceMessage = 'Hampir! Coba lagi untuk lulus.';
            performanceIcon = '📚';
        } else {
            performanceMessage = 'Pelajari lagi materinya ya!';
            performanceIcon = '💪';
        }

        overlay.innerHTML = `
            <div class="modal text-center">
                <div style="font-size: 80px; margin-bottom: 16px;">${isPassed ? '🎉' : '😢'}</div>
                <h2 class="mb-sm">${isPassed ? 'Selamat!' : 'Coba Lagi!'}</h2>
                <p class="text-muted mb-md">${performanceMessage}</p>
                
                <div class="card mb-md" style="text-align: center;">
                    <div style="font-size: 48px; font-weight: 700; color: ${isPassed ? 'var(--success)' : 'var(--danger)'};">
                        ${score}/${totalQuestions}
                    </div>
                    <p class="text-muted mb-sm">Jawaban Benar</p>
                    
                    <!-- Score breakdown -->
                    <div class="flex justify-center gap-lg mt-sm" style="font-size: 13px;">
                        <div>
                            <span class="text-success"><i class="fas fa-check"></i> ${score} benar</span>
                        </div>
                        <div>
                            <span class="text-danger"><i class="fas fa-times"></i> ${wrongAnswers} salah</span>
                        </div>
                    </div>
                </div>
                
                ${isPassed ? `
                    <div class="card mb-md" style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.1));">
                        <div class="flex justify-between items-center mb-sm">
                            <span class="text-muted">Poin Maksimal</span>
                            <span>${Utils.formatCurrency(reward)}</span>
                        </div>
                        <div class="flex justify-between items-center mb-sm">
                            <span class="text-muted">Persentase Skor</span>
                            <span>${rewardPercentage}%</span>
                        </div>
                        <hr style="border-color: rgba(255,255,255,0.1); margin: 8px 0;">
                        <div class="flex justify-between items-center">
                            <span style="font-weight: 600;">Poin Didapat</span>
                            <span style="font-size: 20px; font-weight: 700; color: var(--accent);">
                                +${Utils.formatCurrency(earnedReward)}
                            </span>
                        </div>
                    </div>
                    
                    ${percentage < 100 ? `
                        <p class="text-muted mb-md" style="font-size: 12px;">
                            <i class="fas fa-info-circle"></i>
                            ${wrongAnswers} jawaban salah mengurangi ${100 - rewardPercentage}% dari poin maksimal
                        </p>
                    ` : ''}
                ` : `
                    <div class="alert alert-warning mb-md">
                        <i class="fas fa-exclamation-triangle"></i>
                        Butuh minimal 60% jawaban benar untuk mendapatkan poin
                    </div>
                `}
                
                <div class="text-muted mb-lg" style="font-size: 13px;">
                    <i class="fas fa-clock"></i> Waktu: ${timeTaken} detik
                </div>
                
                <button class="btn btn-primary btn-block" onclick="document.querySelector('.quiz-overlay').remove(); Pages.Missions.render();">
                    Kembali ke Misi
                </button>
            </div>
        `;

        this.quizData = null;
    },

    async loadMissions() {
        try {
            const response = await Api.getMissions(1, 20, this.activeFilter === 'quiz' ? '' : this.activeFilter);
            if (response.success) {
                this.missions = response.data.missions;
                await this.renderMissions();
            }
        } catch (error) {
            console.log('Failed to load missions:', error);
            document.getElementById('missions-list').innerHTML =
                Components.emptyState('🎯', 'Tidak ada misi', 'Misi dari dosen akan muncul di sini');
        }
    },

    async renderMissions() {
        const container = document.getElementById('missions-list');

        if (this.missions.length === 0) {
            container.innerHTML = Components.emptyState('🎯', 'Tidak ada misi', 'Misi dari dosen akan muncul di sini');
            return;
        }

        // Load progress for each mission
        const missionsHTML = [];
        for (const mission of this.missions) {
            let progress = null;
            try {
                const progressResponse = await Api.getMyMissionProgress(mission.id);
                if (progressResponse.success) {
                    progress = progressResponse.data.progress;
                }
            } catch (e) {
                // User hasn't joined this mission
            }
            missionsHTML.push(Components.missionCard(mission, progress));
        }

        container.innerHTML = missionsHTML.join('');
    },

    async joinMission(missionId) {
        Utils.showLoading('Bergabung ke misi...');

        try {
            const response = await Api.joinMission(missionId);
            Utils.hideLoading();

            if (response.success) {
                Utils.toast('Berhasil bergabung ke misi!', 'success');
                await this.loadMissions();
            }
        } catch (error) {
            Utils.hideLoading();

            if (error.code === 'CONFLICT' || error.code === 'ALREADY_JOINED') {
                Utils.toast('Anda sudah bergabung ke misi ini', 'info');
            } else {
                Utils.toast(error.message || 'Gagal bergabung', 'error');
            }
        }
    },

    async completeMission(missionId) {
        const confirmed = await Utils.confirm('Tandai misi ini sebagai selesai?', 'Selesaikan Misi');
        if (!confirmed) return;

        Utils.showLoading('Menyelesaikan misi...');

        try {
            const response = await Api.completeMission(missionId);
            Utils.hideLoading();

            if (response.success) {
                Utils.toast('Misi selesai! Klaim hadiahmu.', 'success');
                await this.loadMissions();
            }
        } catch (error) {
            Utils.hideLoading();
            Utils.toast(error.message || 'Gagal menyelesaikan misi', 'error');
        }
    },

    async claimReward(missionId) {
        Utils.showLoading('Mengklaim hadiah...');

        try {
            const response = await Api.claimMissionReward(missionId);
            Utils.hideLoading();

            if (response.success) {
                this.showClaimSuccess(response.data);
                await this.loadMissions();
            }
        } catch (error) {
            Utils.hideLoading();

            if (error.code === 'DUPLICATE_TRANSACTION' || error.code === 'ALREADY_CLAIMED') {
                Utils.toast('Hadiah sudah diklaim sebelumnya', 'info');
            } else {
                Utils.toast(error.message || 'Gagal klaim hadiah', 'error');
            }
        }
    },

    showClaimSuccess(data) {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay active';
        overlay.innerHTML = `
            <div class="modal text-center">
                <div style="font-size: 80px; margin-bottom: 16px;">🎉</div>
                <h2 class="mb-sm">Selamat!</h2>
                <p class="text-muted mb-lg">Kamu mendapatkan reward misi</p>
                
                <div style="font-size: 36px; font-weight: 700; color: var(--accent); margin-bottom: 16px;">
                    +${Utils.formatCurrency(data.reward?.amount || 0)}
                </div>
                
                <div class="card mb-lg" style="text-align: left;">
                    <div class="flex justify-between">
                        <span class="text-muted">Saldo Baru</span>
                        <span class="text-primary" style="font-weight: 600;">${Utils.formatCurrency(data.wallet?.balance || 0)}</span>
                    </div>
                </div>
                
                <button class="btn btn-primary btn-block" onclick="this.closest('.modal-overlay').remove()">
                    OK
                </button>
            </div>
        `;

        document.body.appendChild(overlay);
    },

    showCreateMission() {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay active';
        overlay.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h3 class="modal-title">Buat Misi Baru</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <form id="create-mission-form">
                    <div class="form-group">
                        <label class="form-label">Judul Misi *</label>
                        <input type="text" class="form-input" id="mission-title" placeholder="Contoh: Baca 5 Bab Buku" required>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Deskripsi</label>
                        <textarea class="form-input" id="mission-description" rows="3" placeholder="Jelaskan misi ini..."></textarea>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Reward (Poin) *</label>
                        <input type="number" class="form-input" id="mission-reward" placeholder="1000" min="1" required>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Tipe</label>
                        <select class="form-input form-select" id="mission-type">
                            <option value="daily">Harian</option>
                            <option value="weekly">Mingguan</option>
                            <option value="special">Spesial</option>
                            <option value="course">Kursus</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Max Peserta (-1 = unlimited)</label>
                        <input type="number" class="form-input" id="mission-max" value="-1">
                    </div>
                    
                    <button type="submit" class="btn btn-primary btn-block">
                        <i class="fas fa-plus"></i> Buat Misi
                    </button>
                </form>
            </div>
        `;

        document.body.appendChild(overlay);

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.remove();
        });

        document.getElementById('create-mission-form').addEventListener('submit', async (e) => {
            e.preventDefault();

            const data = {
                title: document.getElementById('mission-title').value,
                description: document.getElementById('mission-description').value,
                points_reward: parseFloat(document.getElementById('mission-reward').value),
                type: document.getElementById('mission-type').value,
                max_participants: parseInt(document.getElementById('mission-max').value)
            };

            Utils.showLoading('Membuat misi...');

            try {
                const response = await Api.createMission(data);
                Utils.hideLoading();

                if (response.success) {
                    overlay.remove();
                    Utils.toast('Misi berhasil dibuat!', 'success');
                    await this.loadMissions();
                }
            } catch (error) {
                Utils.hideLoading();
                Utils.toast(error.message || 'Gagal membuat misi', 'error');
            }
        });
    }
};
