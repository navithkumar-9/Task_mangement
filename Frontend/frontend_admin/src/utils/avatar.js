export const getAvatarStyle = (username) => {
    const colors = [
        { background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)', color: '#ffffff' }, // Blue
        { background: 'linear-gradient(135deg, #10B981, #047857)', color: '#ffffff' }, // Emerald
        { background: 'linear-gradient(135deg, #EC4899, #BE185D)', color: '#ffffff' }, // Pink
        { background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)', color: '#ffffff' }, // Violet
        { background: 'linear-gradient(135deg, #F59E0B, #B45309)', color: '#ffffff' }, // Amber
        { background: 'linear-gradient(135deg, #06B6D4, #0891B2)', color: '#ffffff' }, // Cyan
        { background: 'linear-gradient(135deg, #EF4444, #B91C1C)', color: '#ffffff' }, // Rose
    ];

    let hash = 0;
    const name = username || '';
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    const color = colors[index];
    return {
        background: color.background,
        color: color.color,
        bg: color.background,
        text: color.color,
    };
};
