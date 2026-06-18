import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';

const GlobalSearchModal = ({ isOpen, onClose }) => {
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState([]);
    const inputRef = useRef(null);
    const debounceRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setResults([]);
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
        }
    }, [isOpen]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const performSearch = async (searchVal) => {
        if (!searchVal.trim()) {
            setResults([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const res = await API.get(`/search/?q=${encodeURIComponent(searchVal)}`);
            if (res.data.success && res.data.data) {
                setResults(res.data.data.results || []);
            } else {
                setResults([]);
            }
        } catch (err) {
            console.error('Global search error', err);
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const value = e.target.value;
        setQuery(value);

        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        debounceRef.current = setTimeout(() => {
            performSearch(value);
        }, 250); // 250ms debouncing delay
    };

    const handleItemClick = (item) => {
        onClose();
        // Dynamic navigation depending on type using react-router-dom
        if (item.type === 'task') {
            navigate('/tasks');
        } else if (item.type === 'announcement') {
            navigate('/announcements');
        } else if (item.type === 'comment') {
            navigate('/tasks'); // Comments are inside tasks modal
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="global-search-backdrop" onClick={onClose}>
            <div className="global-search-modal" onClick={(e) => e.stopPropagation()}>
                <div className="global-search-input-wrapper">
                    <svg
                        className="global-search-icon-svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                    >
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                        ref={inputRef}
                        type="text"
                        className="global-search-input"
                        placeholder="Search tasks, project, announcements, comments..."
                        value={query}
                        onChange={handleInputChange}
                    />
                    {loading && <div className="spinner" style={{ width: '16px', height: '16px' }} />}
                </div>

                <div className="global-search-results">
                    {query.trim().length === 0 ? (
                        <div className="global-search-empty">
                            Type something to search across tasks, project names, comments, and team announcements.
                        </div>
                    ) : results.length === 0 && !loading ? (
                        <div className="global-search-empty">
                            No results found matching "{query}"
                        </div>
                    ) : (
                        <div>
                            <div className="global-search-section-title">Matches</div>
                            {results.map((item, idx) => (
                                <div
                                    key={`${item.type}-${item.id}-${idx}`}
                                    className="global-search-result-item"
                                    onClick={() => handleItemClick(item)}
                                >
                                    <div className="global-search-item-header">
                                        <div className="global-search-item-title-row">
                                            <span className="global-search-item-title">{item.title}</span>
                                            {item.subtitle && (
                                                <span className="global-search-item-subtitle">
                                                    ({item.subtitle})
                                                </span>
                                            )}
                                        </div>
                                        <span className={`global-search-badge badge-${item.type}`}>
                                            {item.type}
                                        </span>
                                    </div>
                                    {item.description && (
                                        <div className="global-search-item-desc">
                                            {item.description}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="global-search-footer">
                    <span>Press <kbd className="global-search-kbd">esc</kbd> to dismiss</span>
                    <span className="global-search-kbd-hint">
                        Search shortcut: <kbd className="global-search-kbd">Ctrl</kbd> + <kbd className="global-search-kbd">K</kbd>
                    </span>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default GlobalSearchModal;
