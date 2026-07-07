class ErrorTracker {
    constructor(username) {
        this.username = username;
        this.key = `duo_errors_${username}`;
        this.data = this.load();
    }

    load() {
        const raw = localStorage.getItem(this.key);
        if (!raw) return { items: {}, recentResults: [] };
        try {
            const parsed = JSON.parse(raw);
            return { items: parsed.items || {}, recentResults: parsed.recentResults || [] };
        } catch (e) {
            return { items: {}, recentResults: [] };
        }
    }

    save() {
        localStorage.setItem(this.key, JSON.stringify(this.data));
    }

    recordResult(itemKey, isCorrect) {
        if (!itemKey) return;
        const now = Date.now();
        const item = this.data.items[itemKey] || { correct: 0, wrong: 0, streak: 0, interval: 1, nextReview: now };

        if (isCorrect) {
            item.correct++;
            item.streak++;
            item.interval = Math.min(30, item.interval * 2);
        } else {
            item.wrong++;
            item.streak = 0;
            item.interval = 1;
        }
        item.nextReview = now + item.interval * 24 * 60 * 60 * 1000;
        item.lastSeen = now;
        this.data.items[itemKey] = item;

        this.data.recentResults.push({ isCorrect, ts: now });
        if (this.data.recentResults.length > 50) this.data.recentResults.shift();

        this.save();
    }

    getWeakItems(limit = 20) {
        const now = Date.now();
        return Object.entries(this.data.items)
            .filter(([, v]) => v.wrong > 0 && v.nextReview <= now)
            .sort((a, b) => {
                const rateA = a[1].wrong / (a[1].correct + a[1].wrong + 1);
                const rateB = b[1].wrong / (b[1].correct + b[1].wrong + 1);
                return rateB - rateA;
            })
            .slice(0, limit)
            .map(([key]) => key);
    }

    recommendDifficulty() {
        const recent = this.data.recentResults.slice(-20);
        if (recent.length < 5) return 1;
        const accuracy = recent.filter(r => r.isCorrect).length / recent.length;
        if (accuracy >= 0.85) return 3;
        if (accuracy >= 0.65) return 2;
        return 1;
    }

    // Mirrors BadgeTracker.hydrateFromRemote() (badges.js) - merges data synced from
    // profiles.stats.errorHistory (see app.js's saveUserProgress()/completeLogin()) into
    // this device's localStorage-only state, so spaced-repetition history survives a
    // device/browser switch instead of silently resetting to empty.
    hydrateFromRemote(remoteData) {
        if (!remoteData) return;
        let changed = false;
        const remoteItems = remoteData.items || {};
        Object.keys(remoteItems).forEach(key => {
            const remoteItem = remoteItems[key];
            const localItem = this.data.items[key];
            // Newest activity wins per item - whichever device practiced this word/pattern
            // more recently has the more accurate streak/interval/nextReview state.
            if (!localItem || (remoteItem.lastSeen || 0) > (localItem.lastSeen || 0)) {
                this.data.items[key] = remoteItem;
                changed = true;
            }
        });
        const remoteResults = remoteData.recentResults || [];
        if (remoteResults.length) {
            this.data.recentResults = [...this.data.recentResults, ...remoteResults]
                .sort((a, b) => a.ts - b.ts)
                .slice(-50);
            changed = true;
        }
        if (changed) this.save();
    }

    getStats() {
        const items = Object.values(this.data.items);
        const totalCorrect = items.reduce((sum, i) => sum + i.correct, 0);
        const totalWrong = items.reduce((sum, i) => sum + i.wrong, 0);
        return {
            totalAnswered: totalCorrect + totalWrong,
            totalCorrect,
            totalWrong,
            accuracy: totalCorrect + totalWrong > 0 ? totalCorrect / (totalCorrect + totalWrong) : 0,
            weakItemCount: this.getWeakItems(1000).length
        };
    }
}

window.ErrorTracker = ErrorTracker;
