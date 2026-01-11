export const ACHIEVEMENTS = [
    // --- Category 1: Newcomer (Easy Wins) ---
    {
        id: 'first_step',
        title: 'First Step',
        description: 'Answer your very first question.',
        icon: '🌱',
        category: 'newcomer'
    },
    {
        id: 'warm_up',
        title: 'Warm Up',
        description: 'Answer 10 questions in total.',
        icon: '🔥',
        category: 'newcomer',
        target: 10 // Progress tracking
    },
    {
        id: 'streaker',
        title: 'Streaker',
        description: 'Reach a 3-day streak.',
        icon: '🗓️',
        category: 'newcomer'
    },
    {
        id: 'collector',
        title: 'Collector',
        description: 'Favorite 5 questions.',
        icon: '❤️',
        category: 'newcomer',
        target: 5
    },
    {
        id: 'oops',
        title: 'Oops!',
        description: 'Make your first mistake. Learning happens!',
        icon: '🤭',
        category: 'newcomer'
    },
    {
        id: 'fixer',
        title: 'Fixer',
        description: 'Retry and clear a mistake.',
        icon: '🛠️',
        category: 'newcomer'
    },
    {
        id: 'goal_setter',
        title: 'Goal Setter',
        description: 'Set a custom Daily Goal.',
        icon: '🎯',
        category: 'newcomer'
    },

    // --- Category 2: Consistency ---
    {
        id: 'week_warrior',
        title: 'Week Warrior',
        description: 'Reach a 7-day streak.',
        icon: '⚔️',
        category: 'consistency'
    },
    {
        id: 'monthly_master',
        title: 'Monthly Master',
        description: 'Reach a 30-day streak.',
        icon: '👑',
        category: 'consistency'
    },
    {
        id: 'daily_hero',
        title: 'Daily Hero',
        description: 'Hit your daily point goal 5 days in a row.',
        icon: '🦸',
        category: 'consistency',
        target: 5
    },
    {
        id: 'weekend_warrior',
        title: 'Weekend Warrior',
        description: 'Play on both Saturday and Sunday.',
        icon: '😎',
        category: 'consistency'
    },
    {
        id: 'high_roller',
        title: 'High Roller',
        description: 'Earn 100 points in a single day.',
        icon: '🎰',
        category: 'consistency'
    },

    // --- Category 3: Skill & Progress ---
    {
        id: 'sharp_shooter',
        title: 'Sharp Shooter',
        description: 'Get 10 "Perfect" answers in a row.',
        icon: '🎯',
        category: 'skill',
        target: 10
    },
    {
        id: 'level_up_a1',
        title: 'A1 Scout',
        description: 'Answer 50 unique questions in Level A1.',
        icon: '🧗',
        category: 'skill',
        target: 50
    },
    {
        id: 'level_up_a2',
        title: 'A2 Explorer',
        description: 'Answer 50 unique questions in Level A2.',
        icon: '🧭',
        category: 'skill',
        target: 50
    },
    {
        id: 'professor',
        title: 'Professor',
        description: 'Answer 100 unique questions in any level.',
        icon: '👨‍🏫',
        category: 'skill',
        target: 100
    },
    {
        id: 'untouchable',
        title: 'Untouchable',
        description: 'Complete a session with 0 mistakes.',
        icon: '✨',
        category: 'skill'
    },

    // --- Category 4: Reviewing ---
    {
        id: 'redemption',
        title: 'Redemption',
        description: 'Clear 50 mistakes from your history.',
        icon: '🧹',
        category: 'review',
        target: 50
    },
    {
        id: 'clean_slate',
        title: 'Clean Slate',
        description: 'Have 0 pending mistakes (min 50 answered).',
        icon: '🧼',
        category: 'review'
    },
    {
        id: 'favorite_fan',
        title: 'Favorite Fan',
        description: 'Play a "Favorites" practice session.',
        icon: '💖',
        category: 'review'
    },

    // --- Category 5: Completionist ---
    {
        id: 'millionaire',
        title: 'Rising Star',
        description: 'Earn 1,000 total points.',
        icon: '🌟',
        category: 'completion',
        target: 1000
    },
    {
        id: 'tycoon',
        title: 'Tycoon',
        description: 'Earn 10,000 total points.',
        icon: '💎',
        category: 'completion',
        target: 10000
    },
    {
        id: 'polyglot',
        title: 'Polyglot',
        description: 'Answer questions in 2 different Levels.',
        icon: '🌍',
        category: 'completion',
        target: 2
    },
    {
        id: 'library',
        title: 'Library',
        description: 'Have 50 active favorites.',
        icon: '📚',
        category: 'completion',
        target: 50
    },
    {
        id: 'complete_deck',
        title: 'Deck Master',
        description: 'Finish all questions in a level.',
        icon: '🏆',
        category: 'completion'
    }
];
