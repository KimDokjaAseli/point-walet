/**
 * WalletPoint - Missions Page (Complete Implementation)
 */
const MissionsPage = {
    missions: [],
    myParticipations: [],
    myCreatedMissions: [],
    currentMission: null,
    currentQuiz: null,
    quizAnswers: {},

    render(container) {
        const user = Storage.getUser();
        const isDosen = user?.role === Config.ROLES.DOSEN;

        container.innerHTML = `
            ${Components.pageHeader('Misi', true)}
            
            <div class="p-md">
                ${isDosen ? `
                    <button class="btn btn-primary btn-block mb-lg" onclick="MissionsPage.showCreateMission()">
                        ➕ Buat Misi Baru
                    </button>
                ` : ''}
                
                <div class="tabs mb-md">
                    <button class="tab-btn active" id="tab-available" onclick="MissionsPage.switchTab('available')">
                        ${isDosen ? 'Semua Misi' : 'Tersedia'}
                    </button>
                    <button class="tab-btn" id="tab-my" onclick="MissionsPage.switchTab('my')">
                        ${isDosen ? 'Misi Saya' : 'Partisipasi'}
                    </button>
                </div>
                
                <div id="missions-content">
                    ${Components.skeletonList(5)}
                </div>
            </div>
            
            <style>
                .tabs {
                    display: flex;
                    gap: 8px;
                    background: var(--bg-card);
                    padding: 4px;
                    border-radius: var(--radius-md);
                }
                .tab-btn {
                    flex: 1;
                    padding: 12px;
                    background: transparent;
                    border: none;
                    color: var(--text-secondary);
                    font-weight: 600;
                    border-radius: var(--radius-sm);
                    cursor: pointer;
                    transition: var(--transition-fast);
                }
                .tab-btn.active {
                    background: var(--primary);
                    color: white;
                }
                .quiz-option {
                    padding: 12px 16px;
                    background: var(--bg-card);
                    border: 2px solid var(--border-color);
                    border-radius: var(--radius-md);
                    margin-bottom: 8px;
                    cursor: pointer;
                    transition: var(--transition-fast);
                }
                .quiz-option:hover {
                    border-color: var(--primary);
                }
                .quiz-option.selected {
                    background: rgba(99, 102, 241, 0.1);
                    border-color: var(--primary);
                }
                .quiz-option input {
                    display: none;
                }
                .participant-card {
                    background: var(--bg-card);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-md);
                    padding: 12px;
                    margin-bottom: 8px;
                }
                .quiz-progress {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 16px;
                    padding: 12px;
                    background: var(--bg-card);
                    border-radius: var(--radius-md);
                }
                .quiz-progress-bar {
                    flex: 1;
                    height: 8px;
                    background: var(--border-color);
                    border-radius: 4px;
                    overflow: hidden;
                }
                .quiz-progress-fill {
                    height: 100%;
                    background: var(--primary);
                    transition: width 0.3s ease;
                }
            </style>
        `;

        this.loadAvailableMissions();
    },

    switchTab(tab) {
        const tabs = document.querySelectorAll('.tab-btn');
        tabs.forEach(t => t.classList.remove('active'));
        document.getElementById(`tab-${tab}`).classList.add('active');

        const user = Storage.getUser();
        const isDosen = user?.role === Config.ROLES.DOSEN;

        if (tab === 'available') {
            this.loadAvailableMissions();
        } else {
            if (isDosen) {
                this.loadMyCreatedMissions();
            } else {
                this.loadMyParticipations();
            }
        }
    },

    // ========================================
    // Load Missions
    // ========================================
    async loadAvailableMissions() {
        const content = document.getElementById('missions-content');
        content.innerHTML = Components.skeletonList(5);

        try {
            const result = await API.getMissions(1, 20);
            if (result.success) {
                this.missions = result.data || [];
                this.renderAvailableMissions();
            }
        } catch (e) {
            console.error('Failed to load missions:', e);
            content.innerHTML = Components.emptyState('❌', 'Gagal Memuat', 'Tidak dapat memuat daftar misi');
        }
    },

    renderAvailableMissions() {
        const content = document.getElementById('missions-content');
        const user = Storage.getUser();

        // Filter out own missions for non-dosen
        let displayMissions = this.missions;
        if (user?.role !== Config.ROLES.DOSEN) {
            displayMissions = this.missions.filter(m => m.creator_id !== user?.id);
        }

        if (displayMissions.length === 0) {
            content.innerHTML = Components.emptyState('🎯', 'Belum ada misi', 'Tunggu dosen membuat misi baru');
            return;
        }

        content.innerHTML = displayMissions.map(mission =>
            Components.missionCard(mission, `MissionsPage.viewDetail(${mission.id})`)
        ).join('');
    },

    async loadMyParticipations() {
        const content = document.getElementById('missions-content');
        content.innerHTML = Components.skeletonList(5);

        try {
            const result = await API.getMyParticipations(1, 20);
            if (result.success) {
                this.myParticipations = result.data || [];
                this.renderMyParticipations();
            }
        } catch (e) {
            console.error('Failed to load participations:', e);
            content.innerHTML = Components.emptyState('❌', 'Gagal Memuat', 'Tidak dapat memuat partisipasi');
        }
    },

    renderMyParticipations() {
        const content = document.getElementById('missions-content');

        if (this.myParticipations.length === 0) {
            content.innerHTML = Components.emptyState('📋', 'Belum ada partisipasi', 'Mulai ikuti misi untuk mendapatkan poin');
            return;
        }

        content.innerHTML = this.myParticipations.map(p => `
            <div class="card" onclick="MissionsPage.viewMyParticipation(${p.mission_id}, '${p.status}')">
                <div class="flex-between mb-sm">
                    <strong>${p.mission_title}</strong>
                    ${Components.badge(this.getStatusLabel(p.status), this.getStatusType(p.status))}
                </div>
                <div class="text-muted text-sm">
                    Mulai: ${Components.formatDateTime(p.started_at)}
                </div>
                ${p.score ? `<div class="text-sm mt-sm">Skor: <strong>${p.score}</strong></div>` : ''}
                ${p.reward_points ? `<div class="text-success text-sm mt-sm">+${Components.formatPoints(p.reward_points)} pts diterima</div>` : ''}
                ${p.status === 'STARTED' || p.status === 'IN_PROGRESS' ? `
                    <div class="text-primary text-sm mt-sm">Tap untuk melanjutkan →</div>
                ` : ''}
            </div>
        `).join('');
    },

    async loadMyCreatedMissions() {
        const content = document.getElementById('missions-content');
        content.innerHTML = Components.skeletonList(5);

        try {
            const result = await API.getMyMissions(1, 20);
            if (result.success) {
                this.myCreatedMissions = result.data || [];
                this.renderMyCreatedMissions();
            }
        } catch (e) {
            console.error('Failed to load my missions:', e);
            content.innerHTML = Components.emptyState('❌', 'Gagal Memuat', 'Tidak dapat memuat misi Anda');
        }
    },

    renderMyCreatedMissions() {
        const content = document.getElementById('missions-content');

        if (this.myCreatedMissions.length === 0) {
            content.innerHTML = Components.emptyState('📋', 'Belum ada misi', 'Buat misi pertama Anda');
            return;
        }

        content.innerHTML = this.myCreatedMissions.map(m => `
            <div class="card" onclick="MissionsPage.viewCreatedMission(${m.id})">
                <div class="flex-between mb-sm">
                    <strong>${m.title}</strong>
                    ${Components.badge(m.is_active ? 'Aktif' : 'Nonaktif', m.is_active ? 'success' : 'danger')}
                </div>
                <div class="flex gap-md text-sm text-muted">
                    <span>🎯 ${m.current_participants || 0} peserta</span>
                    <span>💰 ${Components.formatPoints(m.reward_points)} pts</span>
                </div>
                <div class="text-primary text-sm mt-sm">Lihat peserta →</div>
            </div>
        `).join('');
    },

    // ========================================
    // View Mission Detail
    // ========================================
    async viewDetail(missionId) {
        try {
            const result = await API.getMissionDetail(missionId);
            if (result.success) {
                this.currentMission = result.data;
                this.showMissionDetail(result.data);
            }
        } catch (e) {
            App.showToast('Gagal memuat detail misi', 'error');
        }
    },

    showMissionDetail(mission) {
        const modal = document.getElementById('modal-container');
        const content = document.getElementById('modal-content');
        const typeConfig = Config.MISSION_TYPES[mission.mission_type] || { icon: '📋', label: mission.mission_type };
        const user = Storage.getUser();
        const isOwner = mission.creator_id === user?.id;

        content.innerHTML = `
            <div class="modal-header">
                <h3 class="modal-title">${mission.title}</h3>
                <button class="modal-close" onclick="App.closeModal()">×</button>
            </div>
            
            <div class="flex gap-md mb-md">
                <div class="mission-icon" style="width:48px;height:48px;background:var(--gradient-card);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:24px;">
                    ${typeConfig.icon}
                </div>
                <div>
                    <div>${Components.badge(typeConfig.label, 'primary')}</div>
                    <div class="text-muted text-sm mt-sm">${mission.creator_name || 'Dosen'}</div>
                </div>
            </div>
            
            ${mission.description ? `<p class="mb-md">${mission.description}</p>` : ''}
            
            <div class="card mb-md" style="background: rgba(16, 185, 129, 0.1); border-color: var(--success);">
                <div class="text-center">
                    <div class="text-success" style="font-size: 24px; font-weight: 700;">
                        +${Components.formatPoints(mission.reward_points)}
                    </div>
                    <div class="text-muted text-sm">Poin Reward</div>
                </div>
            </div>
            
            <div class="flex gap-md text-sm mb-lg">
                <div>
                    <span class="text-muted">Kesulitan:</span>
                    ${Components.badge(mission.difficulty, mission.difficulty.toLowerCase())}
                </div>
                <div>
                    <span class="text-muted">Peserta:</span>
                    ${mission.current_participants || 0}${mission.max_participants ? '/' + mission.max_participants : ''}
                </div>
            </div>
            
            ${mission.deadline ? `
                <div class="text-warning text-sm mb-md">
                    ⏰ Deadline: ${Components.formatDateTime(mission.deadline)}
                </div>
            ` : ''}
            
            ${!isOwner ? `
                <button class="btn btn-primary btn-block" onclick="MissionsPage.startMission(${mission.id})">
                    🚀 Mulai Misi
                </button>
            ` : `
                <button class="btn btn-secondary btn-block" onclick="App.closeModal(); MissionsPage.viewCreatedMission(${mission.id})">
                    👥 Lihat Peserta
                </button>
            `}
        `;

        modal.classList.remove('hidden');
    },

    // ========================================
    // Start Mission & Do Quiz
    // ========================================
    async startMission(missionId) {
        try {
            const result = await API.startMission(missionId);
            if (result.success) {
                App.closeModal();
                App.showToast('Misi berhasil dimulai!', 'success');

                // Check if it's a quiz
                if (this.currentMission && this.currentMission.mission_type === 'QUIZ') {
                    this.showQuiz(this.currentMission);
                } else {
                    this.showMissionInProgress(this.currentMission);
                }
            } else {
                throw new Error(result.message);
            }
        } catch (e) {
            const errorMsg = e.response?.message || e.message || 'Gagal memulai misi';
            App.showToast(errorMsg, 'error');
        }
    },

    async viewMyParticipation(missionId, status) {
        // Get mission detail
        try {
            const result = await API.getMissionDetail(missionId);
            if (result.success) {
                this.currentMission = result.data;

                if (status === 'STARTED' || status === 'IN_PROGRESS') {
                    if (this.currentMission.mission_type === 'QUIZ') {
                        this.showQuiz(this.currentMission);
                    } else {
                        this.showMissionInProgress(this.currentMission);
                    }
                } else {
                    // Show completed/submitted status
                    this.showMissionResult(missionId, status);
                }
            }
        } catch (e) {
            App.showToast('Gagal memuat misi', 'error');
        }
    },

    showMissionInProgress(mission) {
        const modal = document.getElementById('modal-container');
        const content = document.getElementById('modal-content');

        content.innerHTML = `
            <div class="modal-header">
                <h3 class="modal-title">${mission.title}</h3>
                <button class="modal-close" onclick="App.closeModal()">×</button>
            </div>
            
            <div class="text-center mb-lg">
                <div style="font-size: 64px;">📝</div>
                <h3 class="mt-md">Misi Sedang Berlangsung</h3>
            </div>
            
            ${mission.description ? `<p class="mb-lg">${mission.description}</p>` : ''}
            
            <div class="form-group">
                <label class="form-label">Catatan / Jawaban Anda</label>
                <textarea id="mission-answer" class="form-input" rows="5" placeholder="Tulis jawaban atau catatan untuk misi ini..."></textarea>
            </div>
            
            <button class="btn btn-primary btn-block" onclick="MissionsPage.submitMission(${mission.id})">
                ✅ Submit Jawaban
            </button>
        `;

        modal.classList.remove('hidden');
    },

    showQuiz(mission) {
        const modal = document.getElementById('modal-container');
        const content = document.getElementById('modal-content');

        // Parse quiz content
        let questions = [];
        try {
            if (mission.content) {
                const parsed = typeof mission.content === 'string' ? JSON.parse(mission.content) : mission.content;
                questions = parsed.questions || [];
            }
        } catch (e) {
            console.error('Failed to parse quiz content:', e);
        }

        // If no questions, show sample quiz
        if (questions.length === 0) {
            questions = [
                {
                    id: 1,
                    question: "Ini adalah contoh pertanyaan quiz. Silakan pilih jawaban yang benar.",
                    options: ["Pilihan A", "Pilihan B", "Pilihan C", "Pilihan D"],
                    correct: 0
                },
                {
                    id: 2,
                    question: "Pertanyaan kedua sebagai contoh.",
                    options: ["Jawaban 1", "Jawaban 2", "Jawaban 3", "Jawaban 4"],
                    correct: 1
                }
            ];
        }

        this.currentQuiz = { questions, currentIndex: 0 };
        this.quizAnswers = {};

        this.renderQuizQuestion(mission);
        modal.classList.remove('hidden');
    },

    renderQuizQuestion(mission) {
        const content = document.getElementById('modal-content');
        const { questions, currentIndex } = this.currentQuiz;
        const question = questions[currentIndex];
        const progress = ((currentIndex + 1) / questions.length) * 100;
        const isLast = currentIndex === questions.length - 1;

        content.innerHTML = `
            <div class="modal-header">
                <h3 class="modal-title">${mission.title}</h3>
                <button class="modal-close" onclick="MissionsPage.confirmExitQuiz()">×</button>
            </div>
            
            <div class="quiz-progress">
                <span class="text-sm">${currentIndex + 1}/${questions.length}</span>
                <div class="quiz-progress-bar">
                    <div class="quiz-progress-fill" style="width: ${progress}%"></div>
                </div>
            </div>
            
            <div class="mb-lg">
                <h4 class="mb-md">${question.question}</h4>
                
                <div id="quiz-options">
                    ${question.options.map((opt, idx) => `
                        <label class="quiz-option ${this.quizAnswers[question.id] === idx ? 'selected' : ''}" 
                               onclick="MissionsPage.selectAnswer(${question.id}, ${idx})">
                            <input type="radio" name="answer" value="${idx}">
                            <span>${String.fromCharCode(65 + idx)}. ${opt}</span>
                        </label>
                    `).join('')}
                </div>
            </div>
            
            <div class="flex gap-md">
                ${currentIndex > 0 ? `
                    <button class="btn btn-secondary" onclick="MissionsPage.prevQuestion()">
                        ← Sebelumnya
                    </button>
                ` : ''}
                <button class="btn btn-primary" style="flex:1" onclick="MissionsPage.${isLast ? 'finishQuiz' : 'nextQuestion'}(${mission.id})" 
                        ${this.quizAnswers[question.id] === undefined ? 'disabled' : ''} id="btn-next">
                    ${isLast ? '✅ Selesai' : 'Selanjutnya →'}
                </button>
            </div>
        `;
    },

    selectAnswer(questionId, answerIndex) {
        this.quizAnswers[questionId] = answerIndex;

        // Update UI
        const options = document.querySelectorAll('.quiz-option');
        options.forEach((opt, idx) => {
            opt.classList.toggle('selected', idx === answerIndex);
        });

        // Enable next button
        const btnNext = document.getElementById('btn-next');
        if (btnNext) btnNext.disabled = false;
    },

    prevQuestion() {
        if (this.currentQuiz.currentIndex > 0) {
            this.currentQuiz.currentIndex--;
            this.renderQuizQuestion(this.currentMission);
        }
    },

    nextQuestion() {
        if (this.currentQuiz.currentIndex < this.currentQuiz.questions.length - 1) {
            this.currentQuiz.currentIndex++;
            this.renderQuizQuestion(this.currentMission);
        }
    },

    confirmExitQuiz() {
        if (confirm('Yakin ingin keluar? Progress quiz akan hilang.')) {
            App.closeModal();
        }
    },

    async finishQuiz(missionId) {
        // Calculate score
        const { questions } = this.currentQuiz;
        let correct = 0;
        questions.forEach(q => {
            if (this.quizAnswers[q.id] === q.correct) {
                correct++;
            }
        });

        const score = Math.round((correct / questions.length) * 100);

        // Submit to backend
        try {
            await API.submitMission(missionId, this.quizAnswers);
            this.showQuizResult(score, correct, questions.length);
        } catch (e) {
            App.showToast('Gagal submit quiz', 'error');
        }
    },

    showQuizResult(score, correct, total) {
        const content = document.getElementById('modal-content');
        const isPassed = score >= 60;

        content.innerHTML = `
            <div class="text-center p-lg">
                <div style="font-size: 64px;">${isPassed ? '🎉' : '😔'}</div>
                <h2 class="mt-md">${isPassed ? 'Selamat!' : 'Coba Lagi'}</h2>
                
                <div class="card mt-lg mb-lg" style="background: ${isPassed ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'}">
                    <div style="font-size: 48px; font-weight: 700; color: ${isPassed ? 'var(--success)' : 'var(--danger)'}">
                        ${score}%
                    </div>
                    <div class="text-muted">Skor Anda</div>
                </div>
                
                <p class="text-muted mb-lg">
                    Anda menjawab <strong>${correct}</strong> dari <strong>${total}</strong> pertanyaan dengan benar.
                    ${isPassed ? 'Reward poin akan diberikan setelah dosen memverifikasi.' : 'Skor minimal 60% untuk lulus quiz.'}
                </p>
                
                <button class="btn btn-primary btn-block" onclick="App.closeModal(); MissionsPage.switchTab('my');">
                    Selesai
                </button>
            </div>
        `;
    },

    async submitMission(missionId) {
        const answer = document.getElementById('mission-answer')?.value || '';

        if (!answer.trim()) {
            App.showToast('Silakan isi jawaban terlebih dahulu', 'warning');
            return;
        }

        try {
            await API.submitMission(missionId, { text: answer });
            App.closeModal();
            App.showToast('Jawaban berhasil dikirim!', 'success');
            this.loadMyParticipations();
            this.switchTab('my');
        } catch (e) {
            App.showToast('Gagal mengirim jawaban', 'error');
        }
    },

    showMissionResult(missionId, status) {
        const participation = this.myParticipations.find(p => p.mission_id === missionId);
        const modal = document.getElementById('modal-container');
        const content = document.getElementById('modal-content');

        let statusEmoji = '📋';
        let statusText = 'Menunggu';

        if (status === 'COMPLETED') {
            statusEmoji = '✅';
            statusText = 'Selesai';
        } else if (status === 'SUBMITTED') {
            statusEmoji = '⏳';
            statusText = 'Menunggu Penilaian';
        } else if (status === 'FAILED') {
            statusEmoji = '❌';
            statusText = 'Tidak Lulus';
        }

        content.innerHTML = `
            <div class="modal-header">
                <h3 class="modal-title">${participation?.mission_title || 'Detail Misi'}</h3>
                <button class="modal-close" onclick="App.closeModal()">×</button>
            </div>
            
            <div class="text-center p-lg">
                <div style="font-size: 64px;">${statusEmoji}</div>
                <h3 class="mt-md">${statusText}</h3>
                
                ${participation?.score ? `
                    <div class="card mt-lg">
                        <div style="font-size: 36px; font-weight: 700;">
                            ${participation.score}%
                        </div>
                        <div class="text-muted">Skor Anda</div>
                    </div>
                ` : ''}
                
                ${participation?.reward_points ? `
                    <div class="text-success mt-md" style="font-size: 20px; font-weight: 700;">
                        +${Components.formatPoints(participation.reward_points)} pts
                    </div>
                ` : ''}
                
                <button class="btn btn-secondary btn-block mt-lg" onclick="App.closeModal()">
                    Tutup
                </button>
            </div>
        `;

        modal.classList.remove('hidden');
    },

    // ========================================
    // Dosen: View Created Mission & Grade
    // ========================================
    async viewCreatedMission(missionId) {
        const modal = document.getElementById('modal-container');
        const content = document.getElementById('modal-content');

        content.innerHTML = `
            <div class="modal-header">
                <h3 class="modal-title">Peserta Misi</h3>
                <button class="modal-close" onclick="App.closeModal()">×</button>
            </div>
            <div class="text-center p-md">
                <div class="loading-spinner" style="margin: 0 auto;"></div>
            </div>
        `;
        modal.classList.remove('hidden');

        try {
            const result = await API.getMissionParticipants(missionId);
            if (result.success) {
                this.renderParticipants(missionId, result.data || []);
            } else {
                throw new Error(result.message);
            }
        } catch (e) {
            content.innerHTML = `
                <div class="modal-header">
                    <h3 class="modal-title">Peserta Misi</h3>
                    <button class="modal-close" onclick="App.closeModal()">×</button>
                </div>
                ${Components.emptyState('❌', 'Gagal Memuat', 'Tidak dapat memuat daftar peserta')}
            `;
        }
    },

    renderParticipants(missionId, participants) {
        const content = document.getElementById('modal-content');

        if (participants.length === 0) {
            content.innerHTML = `
                <div class="modal-header">
                    <h3 class="modal-title">Peserta Misi</h3>
                    <button class="modal-close" onclick="App.closeModal()">×</button>
                </div>
                ${Components.emptyState('👥', 'Belum ada peserta', 'Belum ada mahasiswa yang mengikuti misi ini')}
            `;
            return;
        }

        content.innerHTML = `
            <div class="modal-header">
                <h3 class="modal-title">Peserta Misi (${participants.length})</h3>
                <button class="modal-close" onclick="App.closeModal()">×</button>
            </div>
            
            <div style="max-height: 400px; overflow-y: auto;">
                ${participants.map(p => `
                    <div class="participant-card">
                        <div class="flex-between mb-sm">
                            <strong>${p.user_name || 'User #' + p.user_id}</strong>
                            ${Components.badge(this.getStatusLabel(p.status), this.getStatusType(p.status))}
                        </div>
                        ${p.submitted_at ? `
                            <div class="text-muted text-sm">Submit: ${Components.formatDateTime(p.submitted_at)}</div>
                        ` : ''}
                        ${p.score !== null && p.score !== undefined ? `
                            <div class="text-sm mt-sm">Skor: <strong>${p.score}</strong></div>
                        ` : ''}
                        ${p.status === 'SUBMITTED' ? `
                            <button class="btn btn-primary btn-sm mt-sm" onclick="MissionsPage.showGradeForm(${missionId}, ${p.user_id}, '${p.user_name || 'User'}')">
                                ✏️ Nilai
                            </button>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
        `;
    },

    showGradeForm(missionId, userId, userName) {
        const content = document.getElementById('modal-content');

        content.innerHTML = `
            <div class="modal-header">
                <h3 class="modal-title">Nilai: ${userName}</h3>
                <button class="modal-close" onclick="MissionsPage.viewCreatedMission(${missionId})">×</button>
            </div>
            
            <form id="grade-form">
                <div class="form-group">
                    <label class="form-label">Skor (0-100)</label>
                    <input type="number" id="grade-score" class="form-input" min="0" max="100" placeholder="Masukkan skor" required>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Catatan (opsional)</label>
                    <textarea id="grade-notes" class="form-input" rows="3" placeholder="Catatan untuk mahasiswa..."></textarea>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Status</label>
                    <div class="flex gap-md">
                        <label class="flex-1">
                            <input type="radio" name="grade-approved" value="true" checked> ✅ Lulus
                        </label>
                        <label class="flex-1">
                            <input type="radio" name="grade-approved" value="false"> ❌ Tidak Lulus
                        </label>
                    </div>
                </div>
                
                <div id="grade-error" class="form-error mb-md hidden"></div>
                
                <div class="flex gap-md">
                    <button type="button" class="btn btn-secondary" onclick="MissionsPage.viewCreatedMission(${missionId})">
                        Batal
                    </button>
                    <button type="submit" class="btn btn-primary" style="flex:1">
                        💾 Simpan Nilai
                    </button>
                </div>
            </form>
        `;

        document.getElementById('grade-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.submitGrade(missionId, userId);
        });
    },

    async submitGrade(missionId, userId) {
        const score = parseFloat(document.getElementById('grade-score').value);
        const notes = document.getElementById('grade-notes').value;
        const approved = document.querySelector('input[name="grade-approved"]:checked').value === 'true';
        const errorDiv = document.getElementById('grade-error');

        if (isNaN(score) || score < 0 || score > 100) {
            errorDiv.textContent = 'Skor harus antara 0-100';
            errorDiv.classList.remove('hidden');
            return;
        }

        try {
            const result = await API.gradeMission(missionId, userId, score, notes, approved);
            if (result.success) {
                App.showToast('Nilai berhasil disimpan!', 'success');
                this.viewCreatedMission(missionId);
            } else {
                throw new Error(result.message);
            }
        } catch (e) {
            errorDiv.textContent = e.response?.message || 'Gagal menyimpan nilai';
            errorDiv.classList.remove('hidden');
        }
    },

    // ========================================
    // Create Mission
    // ========================================
    showCreateMission() {
        const modal = document.getElementById('modal-container');
        const content = document.getElementById('modal-content');

        content.innerHTML = `
            <div class="modal-header">
                <h3 class="modal-title">Buat Misi Baru</h3>
                <button class="modal-close" onclick="App.closeModal()">×</button>
            </div>
            
            <form id="create-mission-form">
                ${Components.formInput('mission_title', 'Judul Misi', 'text', 'Masukkan judul')}
                
                <div class="form-group">
                    <label class="form-label">Tipe Misi</label>
                    <select id="mission_type" class="form-input">
                        <option value="QUIZ">📝 Kuis</option>
                        <option value="ASSIGNMENT">📄 Tugas</option>
                        <option value="PROJECT">🔧 Proyek</option>
                        <option value="ATTENDANCE">✅ Kehadiran</option>
                        <option value="OTHER">📌 Lainnya</option>
                    </select>
                </div>
                
                ${Components.formInput('mission_reward', 'Poin Reward', 'number', 'Jumlah poin')}
                
                <div class="form-group">
                    <label class="form-label">Kesulitan</label>
                    <select id="mission_difficulty" class="form-input">
                        <option value="EASY">🟢 Mudah</option>
                        <option value="MEDIUM" selected>🟡 Sedang</option>
                        <option value="HARD">🔴 Sulit</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Maksimal Peserta (opsional)</label>
                    <input type="number" id="mission_max" class="form-input" placeholder="Kosongkan jika tidak dibatasi">
                </div>
                
                <div class="form-group">
                    <label class="form-label">Deskripsi</label>
                    <textarea id="mission_description" class="form-input" rows="3" placeholder="Deskripsi misi"></textarea>
                </div>
                
                <div id="mission-error" class="form-error mb-md hidden"></div>
                
                <button type="submit" class="btn btn-primary btn-block">
                    🚀 Buat Misi
                </button>
            </form>
        `;

        modal.classList.remove('hidden');

        document.getElementById('create-mission-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.createMission();
        });
    },

    async createMission() {
        const title = document.getElementById('mission_title').value;
        const missionType = document.getElementById('mission_type').value;
        const rewardPoints = parseInt(document.getElementById('mission_reward').value);
        const difficulty = document.getElementById('mission_difficulty').value;
        const description = document.getElementById('mission_description').value;
        const maxParticipants = document.getElementById('mission_max').value;
        const errorDiv = document.getElementById('mission-error');

        if (!title || !rewardPoints) {
            errorDiv.textContent = 'Judul dan poin reward harus diisi';
            errorDiv.classList.remove('hidden');
            return;
        }

        const data = {
            title,
            mission_type: missionType,
            reward_points: rewardPoints,
            difficulty,
            description
        };

        if (maxParticipants) {
            data.max_participants = parseInt(maxParticipants);
        }

        try {
            const result = await API.createMission(data);

            if (result.success) {
                App.closeModal();
                App.showToast('Misi berhasil dibuat!', 'success');
                this.loadMyCreatedMissions();
                this.switchTab('my');
            } else {
                throw new Error(result.message);
            }
        } catch (e) {
            errorDiv.textContent = e.response?.message || 'Gagal membuat misi';
            errorDiv.classList.remove('hidden');
        }
    },

    // ========================================
    // Helpers
    // ========================================
    getStatusLabel(status) {
        const labels = {
            'STARTED': 'Dimulai',
            'IN_PROGRESS': 'Berlangsung',
            'SUBMITTED': 'Dikirim',
            'COMPLETED': 'Selesai',
            'FAILED': 'Tidak Lulus',
            'EXPIRED': 'Kadaluarsa'
        };
        return labels[status] || status;
    },

    getStatusType(status) {
        const types = {
            'STARTED': 'primary',
            'IN_PROGRESS': 'primary',
            'SUBMITTED': 'warning',
            'COMPLETED': 'success',
            'FAILED': 'danger',
            'EXPIRED': 'danger'
        };
        return types[status] || 'primary';
    }
};
