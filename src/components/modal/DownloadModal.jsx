import { X, Download, ExternalLink, AlertCircle, ChevronDown, Film, Tv, Package, Copy, Check, Info, ArrowUp, ArrowDown, ChevronRight } from 'lucide-react';
import Skeleton from '../Skeleton';
import { motion, AnimatePresence } from 'framer-motion'; // eslint-disable-line no-unused-vars
import { useState, useEffect, useCallback, memo } from 'react';
import CustomDropdown from '../CustomDropdown';

// Helper to parse quality string into resolution and tags
const parseQualityString = (qualityStr) => {
    if (!qualityStr) return { resolution: 'SD', tags: [] };

    // Extract resolution (e.g., 1080p, 4K)
    let resolution = 'SD';
    if (qualityStr.includes('4K') || qualityStr.includes('2160p')) resolution = '4K';
    else if (qualityStr.includes('1080p')) resolution = '1080p';
    else if (qualityStr.includes('720p')) resolution = '720p';
    else if (qualityStr.includes('480p')) resolution = '480p';

    // Extract tags (content inside parentheses)
    const match = qualityStr.match(/\((.*?)\)/);
    const tags = match ? match[1].split(' ').filter(t => t.trim()) : [];

    return { resolution, tags };
};

// Helper to get quality score for sorting
const getQualityScore = (qualityStr) => {
    if (!qualityStr) return 0;
    if (qualityStr.includes('4K') || qualityStr.includes('2160p')) return 4;
    if (qualityStr.includes('1080p')) return 3;
    if (qualityStr.includes('720p')) return 2;
    if (qualityStr.includes('480p')) return 1;
    return 0;
};

const DownloadModal = memo(({ isOpen, onClose, downloads, seasons, isLoading, error, type }) => {
    const [selectedSeason, setSelectedSeason] = useState(1);
    const [selectedEpisode, setSelectedEpisode] = useState(1);
    const [activeDownloads, setActiveDownloads] = useState([]);
    const [groupedDownloads, setGroupedDownloads] = useState({});
    const [viewMode, setViewMode] = useState('episodes'); // 'episodes' or 'packs'
    const [sortOrder, setSortOrder] = useState('desc'); // 'desc' (High to Low) or 'asc' (Low to High)
    const [expandedGroups, setExpandedGroups] = useState({});

    // Dropdown states
    const [isSeasonOpen, setIsSeasonOpen] = useState(false);
    const [isEpisodeOpen, setIsEpisodeOpen] = useState(false);
    const [copiedIndex, setCopiedIndex] = useState(null);

    useEffect(() => {
        if (copiedIndex) {
            const timer = setTimeout(() => setCopiedIndex(null), 2000);
            return () => clearTimeout(timer);
        }
    }, [copiedIndex]);

    const handleCopy = (link, index) => {
        navigator.clipboard.writeText(link);
        setCopiedIndex(index);
    };

    const toggleGroup = (group) => {
        setExpandedGroups(prev => ({
            ...prev,
            [group]: !prev[group]
        }));
    };

    // Reset selection when modal opens or data changes
    useEffect(() => {
        if (isOpen) {
            if (type === 'series' && seasons && seasons.length > 0) {
                const firstSeason = seasons[0];
                setSelectedSeason(firstSeason.season); // eslint-disable-line react-hooks/set-state-in-effect
                if (firstSeason.episodes && firstSeason.episodes.length > 0) {
                    setSelectedEpisode(firstSeason.episodes[0].episode);
                }
            }
        }
    }, [isOpen, type, seasons]);

    // Update active downloads based on selection and sort
    useEffect(() => {
        let links = [];
        if (type === 'series' && seasons) {
            const seasonData = seasons.find(s => s.season === selectedSeason);
            if (seasonData) {
                // If viewing packs, show packs. Otherwise show episode downloads.
                if (viewMode === 'packs') {
                    links = seasonData.packs || [];
                } else {
                    const episodeData = seasonData.episodes.find(e => e.episode === selectedEpisode);
                    links = episodeData ? episodeData.downloads : [];
                }
            }
        } else {
            links = downloads || [];
        }

        // Sort links
        const sortedLinks = [...links].sort((a, b) => {
            const scoreA = getQualityScore(a.quality);
            const scoreB = getQualityScore(b.quality);
            return sortOrder === 'desc' ? scoreB - scoreA : scoreA - scoreB;
        });

        setActiveDownloads(sortedLinks); // eslint-disable-line react-hooks/set-state-in-effect

        // Group links
        const groups = {};
        sortedLinks.forEach(link => {
            const { resolution } = parseQualityString(link.quality);
            if (!groups[resolution]) groups[resolution] = [];
            groups[resolution].push(link);
        });

        setGroupedDownloads(groups);

        // Default expand the first group based on sort order
        const sortedResolutions = Object.keys(groups).sort((a, b) => {
            const scoreA = getQualityScore(a);
            const scoreB = getQualityScore(b);
            return sortOrder === 'desc' ? scoreB - scoreA : scoreA - scoreB;
        });

        if (sortedResolutions.length > 0) {
            setExpandedGroups({ [sortedResolutions[0]]: true });
        } else {
            setExpandedGroups({});
        }

    }, [type, seasons, downloads, selectedSeason, selectedEpisode, viewMode, sortOrder]);

    // Get sorted groups for rendering
    const sortedGroups = Object.keys(groupedDownloads).sort((a, b) => {
        const scoreA = getQualityScore(a);
        const scoreB = getQualityScore(b);
        return sortOrder === 'desc' ? scoreB - scoreA : scoreA - scoreB;
    });

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, pointerEvents: 'none' }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-0 z-[60] flex md:items-center items-start justify-center bg-black/80 p-4"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.8, opacity: 0, y: 20 }}
                        transition={{
                            type: "spring",
                            damping: 25,
                            stiffness: 300,
                            duration: 0.4
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-[#1a1a1a] w-full max-w-lg md:max-w-5xl md:h-[70vh] h-[88vh] rounded-2xl overflow-hidden shadow-2xl border border-white/10 flex flex-col"
                    >
                        {/* Top Bar */}
                        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-[#1a1a1a] shrink-0">
                            <h3 className="text-xl font-bold text-white flex items-center gap-3">
                                <div className="p-2 bg-white/10 rounded-full">
                                    <Download className="w-5 h-5 text-white" />
                                </div>
                                Download Options
                            </h3>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-white/10 rounded-full transition-colors group"
                            >
                                <X className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-hidden flex flex-col">
                            {isLoading ? (
                                <div className="p-6 h-full overflow-y-auto scrollbar-hide bg-[#141414]">
                                    <div className="space-y-8">
                                        {/* Header Skeleton */}
                                        <div className="flex items-start gap-4">
                                            <Skeleton className="w-12 h-12 rounded-xl shrink-0 hidden sm:block" />
                                            <div className="space-y-2 pt-1">
                                                <Skeleton className="w-32 h-3" />
                                                <Skeleton className="w-48 h-5" />
                                            </div>
                                        </div>

                                        {/* Series Controls Skeleton */}
                                        {type === 'series' && (
                                            <div className="space-y-4">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <Skeleton className="w-12 h-3 ml-1" />
                                                        <Skeleton className="w-full h-[50px] rounded-xl" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Skeleton className="w-12 h-3 ml-1" />
                                                        <Skeleton className="w-full h-[50px] rounded-xl" />
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Links List Skeleton */}
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between px-1">
                                                <div className="flex items-center gap-2">
                                                    <Skeleton className="w-24 h-4" />
                                                    <Skeleton className="w-8 h-3" />
                                                </div>
                                                <Skeleton className="w-24 h-7 rounded-lg" />
                                            </div>

                                            <div className="space-y-4">
                                                {[1, 2, 3].map((i) => (
                                                    <div key={i} className="bg-[#1a1a1a] rounded-xl border border-white/5 overflow-hidden">
                                                        <div className="p-4 flex items-center justify-between">
                                                            <div className="flex items-center gap-3">
                                                                <Skeleton className="w-8 h-8 rounded-lg" />
                                                                <Skeleton className="w-32 h-5" />
                                                                <Skeleton className="w-16 h-5 rounded-full" />
                                                            </div>
                                                            <Skeleton className="w-4 h-4 rounded-full" />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : error ? (
                                <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-4 bg-[#141414]">
                                    <div className="p-6 bg-white/5 rounded-full">
                                        <AlertCircle className="w-12 h-12 text-white" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-white font-semibold text-lg">Download Unavailable</p>
                                        <p className="text-gray-400 max-w-xs mx-auto">{error}</p>
                                    </div>
                                </div>
                            ) : (
                                <>

                                    <div className="flex-1 flex flex-col md:flex-row min-h-0 bg-[#141414] overflow-y-auto md:overflow-hidden">
                                        {/* Left Column: Sidebar (Controls & Tips) */}
                                        <div className="p-4 pb-0 md:p-6 space-y-4 md:space-y-6 md:w-80 md:border-r border-white/5 shrink-0 bg-[#141414] md:overflow-y-auto">
                                            {/* Series Selection Controls */}
                                            {type === 'series' && seasons && seasons.length > 0 && (
                                                <div className="space-y-4">
                                                    <div className="grid grid-cols-2 md:grid-cols-1 gap-4">
                                                        {/* Season Selector */}
                                                        <div className="space-y-2">
                                                            <label className="text-xs text-gray-500 font-bold uppercase tracking-wider ml-1">Season</label>
                                                            <CustomDropdown
                                                                value={selectedSeason}
                                                                options={seasons.map(s => ({ value: s.season, label: `Season ${s.season}` }))}
                                                                onChange={(val) => {
                                                                    setSelectedSeason(val);
                                                                    const seasonData = seasons.find(s => s.season === val);
                                                                    if (seasonData) {
                                                                        // Reset to episodes view when changing season
                                                                        setViewMode('episodes');
                                                                        if (seasonData.episodes.length > 0) {
                                                                            setSelectedEpisode(seasonData.episodes[0].episode);
                                                                        }
                                                                    }
                                                                }}
                                                                isOpen={isSeasonOpen}
                                                                setIsOpen={setIsSeasonOpen}
                                                                buttonClassName="w-full justify-between bg-[#222] border-white/10 hover:bg-[#2a2a2a] hover:border-white/20 py-3"
                                                                menuClassName="bg-[#222] border-white/10"
                                                            />
                                                        </div>

                                                        {/* Episode Selector - Only show if in episodes mode */}
                                                        <div className="space-y-2">
                                                            <label className="text-xs text-gray-500 font-bold uppercase tracking-wider ml-1">Episode</label>
                                                            <CustomDropdown
                                                                value={selectedEpisode}
                                                                options={seasons.find(s => s.season === selectedSeason)?.episodes.map(e => ({ value: e.episode, label: `Episode ${e.episode}` })) || []}
                                                                onChange={setSelectedEpisode}
                                                                isOpen={isEpisodeOpen}
                                                                setIsOpen={setIsEpisodeOpen}
                                                                buttonClassName={`w-full justify-between bg-[#222] border-white/10 hover:bg-[#2a2a2a] hover:border-white/20 py-3 ${viewMode === 'packs' ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                                menuClassName="bg-[#222] border-white/10"
                                                                disabled={viewMode === 'packs'}
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Pack Toggle */}
                                                    {seasons.find(s => s.season === selectedSeason)?.packs?.length > 0 && (
                                                        <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 relative">
                                                            <div
                                                                className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white/10 rounded-lg transition-all duration-300 ease-out ${viewMode === 'packs' ? 'translate-x-[calc(100%+4px)]' : 'translate-x-0'}`}
                                                            />
                                                            <button
                                                                onClick={() => setViewMode('episodes')}
                                                                className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-colors relative z-10 ${viewMode === 'episodes' ? 'text-white' : 'text-gray-400 hover:text-white'}`}
                                                            >
                                                                Single Episodes
                                                            </button>
                                                            <button
                                                                onClick={() => setViewMode('packs')}
                                                                className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-colors relative z-10 ${viewMode === 'packs' ? 'text-white' : 'text-gray-400 hover:text-white'}`}
                                                            >
                                                                Season Pack (Zip)
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* How to Watch Tip - Desktop Placement (Hidden on Mobile) */}
                                            <div className="hidden md:flex bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 gap-3 items-start">
                                                <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                                                <div className="space-y-1">
                                                    <p className="text-sm font-medium text-blue-400">Playback Tip</p>
                                                    <p className="text-xs text-blue-300/80 leading-relaxed">
                                                        For the best experience, we recommend using <span className="text-white font-medium">VLC Media Player</span> or <span className="text-white font-medium">MPV</span> to play downloaded files, as they support all subtitle and audio formats.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right Column: Download Links */}
                                        <div className="flex-1 scrollbar-hide md:overflow-y-auto">
                                            <div className="p-4 border-b border-white/5 flex items-center justify-between shrink-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-medium text-gray-400">Available Links</span>
                                                    <span className="text-xs text-gray-600">({activeDownloads.length})</span>
                                                </div>

                                                {/* Sort Toggle */}
                                                {activeDownloads.length > 1 && (
                                                    <button
                                                        onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                                                        className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-medium text-gray-400 hover:text-white transition-colors border border-white/5"
                                                    >
                                                        {sortOrder === 'desc' ? (
                                                            <>
                                                                <span>High to Low</span>
                                                                <ArrowDown className="w-3 h-3" />
                                                            </>
                                                        ) : (
                                                            <>
                                                                <span>Low to High</span>
                                                                <ArrowUp className="w-3 h-3" />
                                                            </>
                                                        )}
                                                    </button>
                                                )}
                                            </div>

                                            <div className="flex-1 p-4 scrollbar-hide md:overflow-y-auto">
                                                {activeDownloads.length === 0 ? (
                                                    <div className="flex flex-col items-center justify-center py-12 text-gray-500 bg-white/5 rounded-2xl border border-white/5 border-dashed">
                                                        <Download className="w-8 h-8 mb-3 opacity-20" />
                                                        <p>No download links found for this selection.</p>
                                                    </div>
                                                ) : (
                                                    <motion.div layout className="space-y-4">
                                                        {sortedGroups.map((groupResolution) => {
                                                            const groupLinks = groupedDownloads[groupResolution];
                                                            const isExpanded = expandedGroups[groupResolution];

                                                            return (
                                                                <motion.div
                                                                    layout
                                                                    key={groupResolution}
                                                                    className="bg-[#1a1a1a] rounded-xl border border-white/5 overflow-hidden"
                                                                >
                                                                    <button
                                                                        onClick={() => toggleGroup(groupResolution)}
                                                                        className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 transition-colors"
                                                                    >
                                                                        <div className="flex items-center gap-3">
                                                                            <div className={`w-10 h-8 rounded-lg flex items-center justify-center border shrink-0 ${groupResolution === '4K' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500' :
                                                                                groupResolution === '1080p' ? 'bg-blue-500/10 border-blue-500/20 text-blue-500' :
                                                                                    groupResolution === '720p' ? 'bg-green-500/10 border-green-500/20 text-green-500' :
                                                                                        'bg-gray-500/10 border-gray-500/20 text-gray-400'
                                                                                }`}>
                                                                                <span className="text-xs font-bold">{groupResolution}</span>
                                                                            </div>
                                                                            <span className="font-medium text-white">{groupResolution} Options</span>
                                                                            <span className="text-xs text-gray-500 bg-black/20 px-2 py-0.5 rounded-full">{groupLinks.length} links</span>
                                                                        </div>
                                                                        <motion.div
                                                                            animate={{ rotate: isExpanded ? 180 : 0 }}
                                                                            transition={{ duration: 0.2 }}
                                                                        >
                                                                            <ChevronDown className="w-4 h-4 text-gray-400" />
                                                                        </motion.div>
                                                                    </button>

                                                                    <AnimatePresence initial={false}>
                                                                        {isExpanded && (
                                                                            <motion.div
                                                                                initial={{ height: 0, opacity: 0 }}
                                                                                animate={{ height: 'auto', opacity: 1 }}
                                                                                exit={{ height: 0, opacity: 0 }}
                                                                                transition={{ duration: 0.3, ease: "easeInOut" }}
                                                                            >
                                                                                <div className="p-3 space-y-2 bg-[#111]">
                                                                                    {groupLinks.map((item, index) => {
                                                                                        const { tags } = parseQualityString(item.quality);
                                                                                        const key = `${groupResolution}-${index}`;

                                                                                        return (
                                                                                            <div
                                                                                                key={key}
                                                                                                className="group relative overflow-hidden rounded-lg bg-[#222] border border-white/5 hover:border-white/20 transition-all duration-300"
                                                                                            >
                                                                                                <div className="flex items-center justify-between p-3">
                                                                                                    <a
                                                                                                        href={item.link}
                                                                                                        target="_blank"
                                                                                                        rel="noopener noreferrer"
                                                                                                        className="flex items-center gap-3 flex-1 min-w-0"
                                                                                                    >
                                                                                                        <div className="flex flex-col min-w-0 gap-1">
                                                                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                                                                <span className="text-white font-medium text-sm group-hover:text-white transition-colors truncate">
                                                                                                                    Download Link {index + 1}
                                                                                                                </span>
                                                                                                                {tags.map((tag, i) => (
                                                                                                                    <span key={i} className={`text-[10px] px-1.5 py-0.5 rounded border ${tag.includes('HDR') || tag.includes('DV') ? 'bg-purple-500/10 border-purple-500/20 text-purple-400' :
                                                                                                                        tag.includes('Atmos') || tag.includes('DDP') ? 'bg-orange-500/10 border-orange-500/20 text-orange-400' :
                                                                                                                            tag.includes('HEVC') || tag.includes('x265') ? 'bg-teal-500/10 border-teal-500/20 text-teal-400' :
                                                                                                                                'bg-gray-700/30 border-gray-600/30 text-gray-400'
                                                                                                                        }`}>
                                                                                                                        {tag}
                                                                                                                    </span>
                                                                                                                ))}
                                                                                                            </div>
                                                                                                            <span className="text-xs text-gray-500 truncate">{item.host}</span>
                                                                                                        </div>
                                                                                                    </a>

                                                                                                    <div className="flex items-center gap-2 ml-4">
                                                                                                        <button
                                                                                                            onClick={() => handleCopy(item.link, `${key}-copy`)}
                                                                                                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors relative"
                                                                                                            title="Copy Link"
                                                                                                        >
                                                                                                            {copiedIndex === `${key}-copy` ? (
                                                                                                                <Check className="w-3.5 h-3.5 text-green-500" />
                                                                                                            ) : (
                                                                                                                <Copy className="w-3.5 h-3.5" />
                                                                                                            )}
                                                                                                        </button>
                                                                                                        <a
                                                                                                            href={item.link}
                                                                                                            target="_blank"
                                                                                                            rel="noopener noreferrer"
                                                                                                            className="p-1.5 rounded-full bg-white text-black hover:bg-gray-200 transition-colors flex items-center gap-2 font-medium text-xs px-3"
                                                                                                        >
                                                                                                            <Download className="w-3.5 h-3.5" />
                                                                                                            <span className="hidden sm:inline">Download</span>
                                                                                                        </a>
                                                                                                    </div>
                                                                                                </div>
                                                                                            </div>
                                                                                        );
                                                                                    })}
                                                                                </div>
                                                                            </motion.div>
                                                                        )}
                                                                    </AnimatePresence>
                                                                </motion.div>
                                                            );
                                                        })}
                                                    </motion.div>
                                                )}

                                                {/* How to Watch Tip - Mobile Placement (Visible only on Mobile) */}
                                                <div className="flex md:hidden bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 gap-3 items-start mt-6">
                                                    <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                                                    <div className="space-y-1">
                                                        <p className="text-sm font-medium text-blue-400">Playback Tip</p>
                                                        <p className="text-xs text-blue-300/80 leading-relaxed">
                                                            For the best experience, we recommend using <span className="text-white font-medium">VLC Media Player</span> or <span className="text-white font-medium">MPV</span> to play downloaded files, as they support all subtitle and audio formats.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
});

DownloadModal.displayName = 'DownloadModal';

export default DownloadModal;
