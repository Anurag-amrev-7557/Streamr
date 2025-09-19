import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { ArrowsPointingOutIcon, ArrowsPointingInIcon } from '@heroicons/react/24/outline'
import { useParams, useNavigate } from 'react-router-dom'
import mangadexService from '../services/mangadexService'
import EnhancedLoadingIndicator from '../components/EnhancedLoadingIndicator'
import enhancedLoadingService from '../services/enhancedLoadingService'
import { preloadImages } from '../services/imageOptimizationService'

const MangaReaderPage = () => {
	const { hid } = useParams()
	const navigate = useNavigate()
	const [images, setImages] = useState([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState('')
	const [scale, setScale] = useState(1)
	const [fitWidth, setFitWidth] = useState(true)
	const [currentIndex, setCurrentIndex] = useState(0)
	const [retryCount, setRetryCount] = useState(0)
	const [imageLoadingStates, setImageLoadingStates] = useState({})
	const [preloadedImages, setPreloadedImages] = useState(new Set())
	const [networkProfile, setNetworkProfile] = useState('fast')
	const containerRef = useRef(null)
	const contentRef = useRef(null)
	const imageRefs = useRef([])
	const preloadControllerRef = useRef(null)
	
	// Chapter navigation state
	const [mangaInfo, setMangaInfo] = useState(null)
	const [mangaId, setMangaId] = useState(null)
	const [mangaSlug, setMangaSlug] = useState(null)
	const [allChapters, setAllChapters] = useState([])
	const [currentChapterIndex, setCurrentChapterIndex] = useState(-1)
	const [nextChapter, setNextChapter] = useState(null)
	const [prevChapter, setPrevChapter] = useState(null)
	
	// Draggable navigation state
	const [navPosition, setNavPosition] = useState({ x: 0, y: 0 })
	const [isDragging, setIsDragging] = useState(false)
	const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
	const desktopNavRef = useRef(null)
	const mobileNavRef = useRef(null)
	
	// Scroll detection for mobile navigation
	const [isScrolling, setIsScrolling] = useState(false)
	const [showNavButtons, setShowNavButtons] = useState(true)
	const scrollTimeoutRef = useRef(null)
	
	// Theme state
	const [theme, setTheme] = useState(() => {
		try {
			return localStorage.getItem('mangaReader.theme') || 'black'
		} catch {
			return 'black'
		}
	})
	
	// FIXED: Add mounted ref for memory leak prevention
	const isMountedRef = useRef(true)

	// Theme options
	const themeOptions = [
		{ id: 'black', name: 'Black', bg: 'bg-black', text: 'text-white', color: '#000000' },
		{ id: 'dark', name: 'Dark', bg: 'bg-gray-900', text: 'text-white', color: '#1f2937' },
		{ id: 'light', name: 'Light', bg: 'bg-white', text: 'text-gray-900', color: '#ffffff' },
		{ id: 'sepia', name: 'Sepia', bg: 'bg-amber-50', text: 'text-amber-900', color: '#fffbeb' },
		{ id: 'blue', name: 'Blue', bg: 'bg-blue-900', text: 'text-blue-100', color: '#1e3a8a' },
		{ id: 'green', name: 'Green', bg: 'bg-green-900', text: 'text-green-100', color: '#14532d' }
	]

	// Theme persistence
	useEffect(() => {
		try {
			localStorage.setItem('mangaReader.theme', theme)
		} catch {}
	}, [theme])

	// Cycle through themes
	const cycleTheme = useCallback(() => {
		const currentIndex = themeOptions.findIndex(t => t.id === theme)
		const nextIndex = (currentIndex + 1) % themeOptions.length
		setTheme(themeOptions[nextIndex].id)
	}, [theme])

	// Get current theme info
	const currentTheme = themeOptions.find(t => t.id === theme) || themeOptions[0]

	// FIXED: Enhanced cleanup on unmount to prevent memory leaks
	useEffect(() => {
		isMountedRef.current = true
		
		// Native lazy loading will be used instead of custom lazy loader
		
		// Monitor network status
		const cleanupNetworkMonitoring = enhancedLoadingService.monitorNetworkStatus((profile) => {
			if (isMountedRef.current) {
				setNetworkProfile(profile)
			}
		})
		
		return () => {
			isMountedRef.current = false
			
			// Clear image refs to help garbage collection
			imageRefs.current = []
			
			// No lazy loader cleanup needed
			
			// Cleanup network monitoring
			cleanupNetworkMonitoring()
			
			// Cancel any ongoing preloading
			if (preloadControllerRef.current) {
				preloadControllerRef.current.abort()
			}
			
			// Clear scroll timeout
			if (scrollTimeoutRef.current) {
				clearTimeout(scrollTimeoutRef.current)
			}
		}
	}, [])

	useEffect(() => {
		imageRefs.current = []
	}, [images])

	// Scroll detection for mobile navigation buttons
	useEffect(() => {
		const container = containerRef.current
		if (!container) return

		const handleScroll = () => {
			if (!isMountedRef.current) return
			
			setIsScrolling(true)
			setShowNavButtons(false)
			
			// Clear existing timeout
			if (scrollTimeoutRef.current) {
				clearTimeout(scrollTimeoutRef.current)
			}
			
			// Show buttons after scrolling stops
			scrollTimeoutRef.current = setTimeout(() => {
				if (isMountedRef.current) {
					setIsScrolling(false)
					setShowNavButtons(true)
				}
			}, 1000) // Show buttons 1 second after scrolling stops
		}

		container.addEventListener('scroll', handleScroll, { passive: true })
		
		return () => {
			container.removeEventListener('scroll', handleScroll)
			if (scrollTimeoutRef.current) {
				clearTimeout(scrollTimeoutRef.current)
			}
		}
	}, [images.length])

	// Load manga info and chapters for navigation
	useEffect(() => {
		if (!hid || !isMountedRef.current) return

		const loadMangaData = async () => {
			try {
				// Load MangaDex chapter to infer manga id via relationships
				const ch = await mangadexService.getChapter(hid)
				const relManga = (ch?.data?.relationships || []).find(r => r?.type === 'manga')
				if (relManga?.id) setMangaId(relManga.id)
				
				// Load a small feed to derive prev/next
				if (relManga?.id) {
					const feed = await mangadexService.getMangaFeed(relManga.id, { limit: 100, translatedLanguage: ['en'], order: { chapter: 'asc' } })
					const list = (feed?.data || []).map(c => ({
						id: c?.id, hid: c?.id, chap: c?.attributes?.chapter, title: c?.attributes?.title
					}))
					setAllChapters(list)
					const idx = list.findIndex(c => c.hid === hid)
					setCurrentChapterIndex(idx)
					setPrevChapter(idx > 0 ? list[idx - 1] : null)
					setNextChapter(idx >= 0 && idx < list.length - 1 ? list[idx + 1] : null)
				}
				
			} catch (error) {
				console.error('Failed to load manga data for navigation:', error)
			}
		}

		loadMangaData()
	}, [hid])

	// Preload images when current index changes
	useEffect(() => {
		if (!images.length || currentIndex < 0 || !isMountedRef.current) return
		
		const preloadAdjacentImages = async () => {
			const preloadRange = networkProfile === 'fast' ? 3 : networkProfile === 'slow' ? 2 : 1
			const startIndex = Math.max(0, currentIndex - preloadRange)
			const endIndex = Math.min(images.length - 1, currentIndex + preloadRange)
			
			const imagesToPreload = []
			for (let i = startIndex; i <= endIndex; i++) {
				if (images[i]) {
					imagesToPreload.push(images[i])
				}
			}
			
			if (imagesToPreload.length > 0) {
				try {
					await preloadImages(imagesToPreload)
					if (isMountedRef.current) {
						setPreloadedImages(prev => {
							const newSet = new Set(prev)
							for (let i = startIndex; i <= endIndex; i++) {
								newSet.add(i)
							}
							return newSet
						})
					}
				} catch (error) {
					console.warn('Failed to preload images:', error)
				}
			}
		}
		
		preloadAdjacentImages()
	}, [currentIndex, images.length, networkProfile])

	// Memory optimization - cleanup old image states periodically
	useEffect(() => {
		if (images.length === 0) return
		
		const cleanupInterval = setInterval(() => {
			if (!isMountedRef.current) return
			
			// Keep only states for images within a reasonable range of current position
			const keepRange = 10
			const startIndex = Math.max(0, currentIndex - keepRange)
			const endIndex = Math.min(images.length - 1, currentIndex + keepRange)
			
			setImageLoadingStates(prev => {
				const newStates = {}
				for (let i = startIndex; i <= endIndex; i++) {
					if (prev[i]) {
						newStates[i] = prev[i]
					}
				}
				return newStates
			})
		}, 30000) // Cleanup every 30 seconds
		
		return () => clearInterval(cleanupInterval)
	}, [images.length, currentIndex])

	useEffect(() => {
		const container = containerRef.current
		const target = imageRefs.current[currentIndex]
		if (!container || !target || !isMountedRef.current) return
		// Compute target position relative to container
		const containerTop = container.getBoundingClientRect().top
		const targetTop = target.getBoundingClientRect().top
		const currentScrollTop = container.scrollTop
		const delta = targetTop - containerTop
		const padding = 12
		container.scrollTo({ top: Math.max(0, currentScrollTop + delta - padding), behavior: 'smooth' })
	}, [currentIndex, images.length])

	// Enhanced chapter loading with advanced error handling and retry mechanisms
	useEffect(() => {
		if (!isMountedRef.current || !hid) return
		
		setLoading(true)
		setError('')
		setImageLoadingStates({})
		setPreloadedImages(new Set())
		
		const loadChapterImages = async () => {
			try {
				const operation = async (signal) => {
					// Check if component is still mounted before making request
					if (!isMountedRef.current) {
						throw new Error('Component unmounted')
					}
					// MangaDex At-Home: get server then build page URLs
					const atHome = await mangadexService.getAtHomeServer(hid)
					const base = atHome?.baseUrl
					const ch = await mangadexService.getChapter(hid)
					const hash = ch?.data?.attributes?.hash
					const data = ch?.data?.attributes?.data || []
					const dataSaver = ch?.data?.attributes?.dataSaver || []
					const files = data.length ? data : dataSaver
					return {
						success: true,
						data: files.map(f => `${base}/data/${hash}/${f}`)
					}
				}
				
				const result = await enhancedLoadingService.retryWithBackoff(operation, 'chapter images')
				
				if (!isMountedRef.current) return
				
					if (result.success) {
						const data = result.data
						const normalized = Array.isArray(data) ? data : []
					
					setImages(normalized)
					setCurrentIndex(0)
					
					// Initialize image loading states
					const initialStates = {}
					normalized.forEach((_, index) => {
						initialStates[index] = { loading: false, error: false, loaded: false }
					})
					setImageLoadingStates(initialStates)
					
					// Preloading will be handled by the useEffect that watches currentIndex
				} else {
					throw result.error
				}
			} catch (err) {
				if (!isMountedRef.current) return
				
				// Handle specific error cases
				let errorMessage = 'Unable to load manga'
				
				if (err.name === 'AbortError') {
					errorMessage = 'Request was cancelled. Please try again.'
				} else if (err.message && err.message.includes('signal is aborted')) {
					errorMessage = 'Request was cancelled. Please try again.'
				} else if (err.message && err.message.includes('Component unmounted')) {
					// Don't show error if component was unmounted
					return
				} else {
					errorMessage = enhancedLoadingService.getErrorMessage(err, 'chapter')
				}
				
				setError(errorMessage)
			} finally {
				if (isMountedRef.current) {
					setLoading(false)
				}
			}
		}
		
		loadChapterImages()
	}, [hid, retryCount])

	const handleRetry = useCallback(() => {
		setRetryCount(c => c + 1)
	}, [])

	// Chapter navigation functions
	const goToNextChapter = useCallback(() => {
		if (nextChapter?.hid) {
			navigate(`/manga/chapter/${encodeURIComponent(nextChapter.hid)}`)
		}
	}, [nextChapter, navigate])

	const goToPrevChapter = useCallback(() => {
		if (prevChapter?.hid) {
			navigate(`/manga/chapter/${encodeURIComponent(prevChapter.hid)}`)
		}
	}, [prevChapter, navigate])

	// Draggable navigation functions
	const handleMouseDown = useCallback((e) => {
		if (e.target.closest('button')) return // Don't drag if clicking on buttons
		
		setIsDragging(true)
		const rect = (desktopNavRef.current || mobileNavRef.current)?.getBoundingClientRect()
		if (rect) {
			setDragOffset({
				x: e.clientX - rect.left,
				y: e.clientY - rect.top
			})
		}
		e.preventDefault()
	}, [])

	const handleMouseMove = useCallback((e) => {
		if (!isDragging) return
		
		const newX = e.clientX - dragOffset.x
		const newY = e.clientY - dragOffset.y
		
		// Constrain to viewport
		const navElement = desktopNavRef.current || mobileNavRef.current
		const maxX = window.innerWidth - (navElement?.offsetWidth || 0)
		const maxY = window.innerHeight - (navElement?.offsetHeight || 0)
		
		setNavPosition({
			x: Math.max(0, Math.min(newX, maxX)),
			y: Math.max(0, Math.min(newY, maxY))
		})
	}, [isDragging, dragOffset])

	const handleMouseUp = useCallback(() => {
		setIsDragging(false)
	}, [])

	const handleTouchStart = useCallback((e) => {
		if (e.target.closest('button')) return // Don't drag if touching buttons
		
		setIsDragging(true)
		const rect = (desktopNavRef.current || mobileNavRef.current)?.getBoundingClientRect()
		if (rect) {
			setDragOffset({
				x: e.touches[0].clientX - rect.left,
				y: e.touches[0].clientY - rect.top
			})
		}
		e.preventDefault()
	}, [])

	const handleTouchMove = useCallback((e) => {
		if (!isDragging) return
		
		const newX = e.touches[0].clientX - dragOffset.x
		const newY = e.touches[0].clientY - dragOffset.y
		
		// Constrain to viewport
		const navElement = desktopNavRef.current || mobileNavRef.current
		const maxX = window.innerWidth - (navElement?.offsetWidth || 0)
		const maxY = window.innerHeight - (navElement?.offsetHeight || 0)
		
		setNavPosition({
			x: Math.max(0, Math.min(newX, maxX)),
			y: Math.max(0, Math.min(newY, maxY))
		})
		e.preventDefault()
	}, [isDragging, dragOffset])

	const handleTouchEnd = useCallback(() => {
		setIsDragging(false)
	}, [])

	// Add global event listeners for dragging
	useEffect(() => {
		if (isDragging) {
			document.addEventListener('mousemove', handleMouseMove)
			document.addEventListener('mouseup', handleMouseUp)
			document.addEventListener('touchmove', handleTouchMove, { passive: false })
			document.addEventListener('touchend', handleTouchEnd)
			
			return () => {
				document.removeEventListener('mousemove', handleMouseMove)
				document.removeEventListener('mouseup', handleMouseUp)
				document.removeEventListener('touchmove', handleTouchMove)
				document.removeEventListener('touchend', handleTouchEnd)
			}
		}
	}, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd])

	// Enhanced image loading handlers
	const handleImageLoad = useCallback((index) => {
		if (!isMountedRef.current) return
		setImageLoadingStates(prev => ({
			...prev,
			[index]: { loading: false, error: false, loaded: true }
		}))
	}, [])

	const handleImageError = useCallback((index) => {
		if (!isMountedRef.current) return
		setImageLoadingStates(prev => ({
			...prev,
			[index]: { loading: false, error: true, loaded: false }
		}))
	}, [])

	const handleImageLoadStart = useCallback((index) => {
		if (!isMountedRef.current) return
		setImageLoadingStates(prev => ({
			...prev,
			[index]: { loading: true, error: false, loaded: false }
		}))
	}, [])

	// Enhanced image component with lazy loading
	const MangaImage = useCallback(({ src, index, alt }) => {
		const imageRef = useRef(null)
		
		return (
			<div className="relative">
				{imageLoadingStates[index]?.loading && (
					<div className="absolute inset-0 flex items-center justify-center bg-gray-800/50 rounded-xl">
						<div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
					</div>
				)}
				{imageLoadingStates[index]?.error && (
					<div className="absolute inset-0 flex items-center justify-center bg-red-900/50 rounded-xl">
						<div className="text-red-300 text-sm">Failed to load</div>
					</div>
				)}
				<img
					ref={(el) => { 
						imageRefs.current[index] = el
						imageRef.current = el
					}}
					src={src}
					alt={alt}
					className={`${fitWidth ? 'w-full h-auto max-w-5xl' : 'h-auto'} rounded-xl shadow-lg`}
					style={fitWidth ? undefined : { width: 'auto' }}
					loading="lazy"
					onLoadStart={() => handleImageLoadStart(index)}
					onLoad={() => handleImageLoad(index)}
					onError={() => handleImageError(index)}
					crossOrigin="anonymous"
				/>
			</div>
		)
	}, [fitWidth, imageLoadingStates, handleImageLoad, handleImageError, handleImageLoadStart])

	// Controls
	const zoomIn = useCallback(() => setScale(s => Math.min(3, parseFloat((s + 0.1).toFixed(2)))), [])
	const zoomOut = useCallback(() => setScale(s => Math.max(0.5, parseFloat((s - 0.1).toFixed(2)))), [])
	const resetZoom = useCallback(() => setScale(1), [])
	const toggleFitWidth = useCallback(() => setFitWidth(v => !v), [])

	// FIXED: Keyboard shortcuts with memory leak prevention
	useEffect(() => {
		const onKey = (e) => {
			if (!isMountedRef.current) return
			if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable)) return
			if (e.key === '+' || e.key === '=') { e.preventDefault(); zoomIn(); }
			if (e.key === '-' || e.key === '_') { e.preventDefault(); zoomOut(); }
			if (e.key === '0') { e.preventDefault(); resetZoom(); }
			if (e.key === 'f' || e.key === 'F') { e.preventDefault(); toggleFitWidth(); }
			// Chapter navigation shortcuts
			if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
				e.preventDefault()
				if (e.key === 'ArrowLeft' && prevChapter) {
					goToPrevChapter()
				} else if (e.key === 'ArrowRight' && nextChapter) {
					goToNextChapter()
				}
			}
		}
		document.addEventListener('keydown', onKey)
		return () => document.removeEventListener('keydown', onKey)
	}, [zoomIn, zoomOut, resetZoom, toggleFitWidth, goToPrevChapter, goToNextChapter, prevChapter, nextChapter])


	return (
		<>
			<div className={`min-h-screen transition-colors duration-300 ${currentTheme.bg} ${currentTheme.text}`}>
				{/* Network Status Indicator */}
				{networkProfile !== 'fast' && (
					<div className="sticky top-0 z-50 bg-yellow-500/20 border-b border-yellow-500/30 text-yellow-300 text-center py-1 text-sm">
						{networkProfile === 'slow' ? 'Slow connection detected - optimizing loading' : 'Very slow connection - reduced preloading'}
					</div>
				)}

			{/* Top Controls Bar */}
			<div className="sticky top-0 z-40 bg-[#121417]/80 backdrop-blur-md border-b border-white/10">
				<div className="mx-auto max-w-6xl px-2 md:px-3 py-1.5 md:py-2 flex items-center justify-between md:justify-start gap-2 md:gap-2 overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
					<div className="relative inline-block group">
						<button
							onClick={() => {
								// Navigate back to manga details using the manga slug
								if (mangaSlug) {
									navigate(`/manga/${mangaSlug}`)
								} else {
									navigate('/manga')
								}
							}}
							className="inline-flex items-center justify-center w-8 h-8 md:w-9 md:h-9 rounded-full bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-white/20 shadow-sm hover:shadow backdrop-blur-sm transition-all duration-200 shrink-0 focus:outline-none focus:ring-2 focus:ring-white/20"
							aria-label="Back to manga details"
						>
							<span className="text-sm md:text-base">←</span>
						</button>
						{/* Tooltip */}
						<div className="absolute left-full border border-white/10 top-1/2 -translate-y-1/2 ml-3 px-3 py-2 bg-black/90 text-white text-sm rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap z-50 shadow-lg">
							{mangaInfo?.title ? `Back to ${mangaInfo.title}` : 'Back to manga details'}
							{/* Tooltip arrow */}
							<div className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-t-[6px] border-b-[6px] border-r-[6px] border-transparent border-r-black/90"></div>
						</div>
					</div>
					<div className="h-6 w-px bg-white/10 mx-1 hidden md:block" />
					<div className="flex items-center gap-2 md:gap-2 shrink-0">
						<button onClick={zoomOut} className="w-8 h-8 md:w-9 md:h-9 rounded-full flex justify-center items-center bg-white/5 hover:bg-white/10 text-white text-xs md:text-sm border border-white/10" aria-label="Zoom out">
							<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
							</svg>
						</button>
						<div className="px-2 text-white/90 text-xs md:text-sm tabular-nums">{Math.round(scale * 100)}%</div>
						<button onClick={zoomIn} className="w-8 h-8 md:w-9 md:h-9 rounded-full flex justify-center items-center bg-white/5 hover:bg-white/10 text-white text-xs md:text-sm border border-white/10" aria-label="Zoom in">
							<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
							</svg>
						</button>
						<button onClick={resetZoom} className="w-8 h-8 md:w-9 md:h-9 rounded-full flex justify-center items-center bg-white/5 hover:bg-white/10 text-white text-xs md:text-sm border border-white/10" aria-label="Reset zoom">
							<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
							</svg>
						</button>
					</div>
					<div className="h-6 w-px bg-white/10 mx-1 hidden md:block" />
					
					{/* Chapter Navigation - Desktop (removed from top bar) */}
					
					<button
						onClick={toggleFitWidth}
						className={`inline-flex items-center whitespace-nowrap px-2 py-1 md:px-3 md:py-1.5 rounded-full text-xs md:text-sm border transition-all duration-300 ease-in-out ${fitWidth ? 'bg-white/80 border-white/80 text-black' : 'bg-white/5 hover:bg-white/10 text-white border-white/10'}`}
						aria-label={fitWidth ? 'Fit: Width' : 'Fit: Original'}
					>
						<span className="whitespace-nowrap transition-all duration-300 ease-in-out min-w-0 overflow-hidden">
							<span className={`inline-block transition-all duration-300 ease-in-out ${fitWidth ? 'w-20' : 'w-24'}`}>
								{fitWidth ? 'Fit: Width' : 'Fit: Original'}
							</span>
						</span>
					</button>
					
					{/* Theme Switcher - Desktop Only */}
					<div className="hidden md:flex items-center gap-2">
						<div className="h-6 w-px bg-white/10 mx-1" />
						<button
							onClick={cycleTheme}
							className="inline-flex items-center gap-2 px-3 py-1 md:px-3 md:py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-white text-sm border border-white/10 hover:border-white/20 transition-all duration-200 group h-8 md:h-9"
							aria-label="Cycle theme"
							title={`Current: ${currentTheme.name} - Click to cycle themes`}
						>
							{/* Theme icon based on current theme */}
							{theme === 'black' && (
								<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
									<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
								</svg>
							)}
							{theme === 'dark' && (
								<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
									<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
								</svg>
							)}
							{theme === 'light' && (
								<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
									<circle cx="12" cy="12" r="5"/>
									<path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
								</svg>
							)}
							{theme === 'sepia' && (
								<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
									<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
								</svg>
							)}
							{theme === 'blue' && (
								<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
									<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
								</svg>
							)}
							{theme === 'green' && (
								<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
									<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
								</svg>
							)}
							<span className="text-xs">{currentTheme.name}</span>
							<svg className="w-3 h-3 transition-transform duration-200 group-hover:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
							</svg>
						</button>
					</div>
					
					<div className="md:ml-auto flex items-center gap-2 shrink-0">
						{/* Page Indicator - Mobile: Simplified, Desktop: Full */}
						{images.length > 0 && (
							<div className="flex items-center gap-2 text-xs text-white/70">
								<span className="px-2 py-1 bg-white/10 rounded-full">
									{currentIndex + 1} / {images.length}
								</span>
								{/* Only show loading spinner on desktop */}
								{Object.values(imageLoadingStates).some(state => state?.loading) && (
									<div className="w-4 h-4 border border-white/20 border-t-white rounded-full animate-spin hidden md:block" />
								)}
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Reader Content */}
			{error ? (
				<EnhancedLoadingIndicator
					isLoading={false}
					error={error}
					retryCount={retryCount}
					onRetry={handleRetry}
					context="chapter"
					className="px-3 py-6 min-h-[60vh] flex items-center justify-center"
					networkProfile={networkProfile}
				/>
			) : (loading && images.length === 0) ? (
				<EnhancedLoadingIndicator
					isLoading={true}
					error={null}
					retryCount={retryCount}
					onRetry={handleRetry}
					context="chapter"
					className="px-3 py-6 min-h-[60vh] flex items-center justify-center"
					hasContent={images.length > 0}
					networkProfile={networkProfile}
				/>
			) : (
				!loading && images.length > 0 && (
					<div ref={containerRef} className={`px-2 pb-20 md:pb-20 overflow-auto transition-colors duration-300 ${currentTheme.bg}`}>
						<div
							ref={contentRef}
							className="flex flex-col items-center gap-4 pt-2 md:pt-4"
							style={{ transform: `scale(${scale})`, transformOrigin: 'center top' }}
						>
							{images.map((src, idx) => (
								<MangaImage
									key={idx}
									src={src}
									index={idx}
									alt={`Page ${idx + 1}`}
								/>
							))}
						</div>
					</div>
				)
			)}


			{/* Chapter Navigation Buttons - Mobile Fixed Bottom */}
			{(nextChapter || prevChapter) && createPortal(
				<div className={`md:hidden fixed bottom-0 left-0 right-0 z-50 transition-all duration-300 ${
					showNavButtons ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
				}`} style={{ 
					position: 'fixed',
					bottom: 0,
					left: 0,
					right: 0,
					zIndex: 9999
				}}>
					<div className="bg-black/95 backdrop-blur-lg border-t border-white/20 px-4 py-3">
						<div className="flex items-center justify-between">
							{/* Previous Chapter Button - Far Left */}
							<div className={`flex-1 flex justify-start transition-all duration-300 ${prevChapter ? 'opacity-100' : 'opacity-0 w-0'}`}>
								{prevChapter && (
									<button
										onClick={goToPrevChapter}
										className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 text-white text-sm font-medium rounded-full transition-all duration-200 hover:scale-105 active:scale-95 border border-white/10 hover:border-white/20"
										aria-label={`Previous: ${prevChapter.chap ? `Ch ${prevChapter.chap}` : prevChapter.title || 'Chapter'}`}
									>
										<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
										</svg>
										<span className="text-white/90">
											{prevChapter.chap ? `Ch ${prevChapter.chap}` : 'Prev'}
										</span>
									</button>
								)}
							</div>
							
							{/* Chapter Info - Center */}
							<div className="flex items-center gap-3 text-white/70 text-sm">
								<div className="h-5 w-px bg-white/20"></div>
								<span className="px-3 py-1.5 bg-white/10 rounded-full font-medium text-white/90">
									{currentChapterIndex >= 0 && allChapters[currentChapterIndex] 
										? `Ch ${allChapters[currentChapterIndex].chap || allChapters[currentChapterIndex].title || '?'}` 
										: '?'} / {allChapters.length}
								</span>
								{mangaInfo && (
									<span className="text-xs text-white/50 max-w-20 truncate hidden sm:block">
										{mangaInfo.title}
									</span>
								)}
								<div className="h-5 w-px bg-white/20"></div>
							</div>
							
							{/* Next Chapter Button - Far Right */}
							<div className={`flex-1 flex justify-end transition-all duration-300 ${nextChapter ? 'opacity-100' : 'opacity-0 w-0'}`}>
								{nextChapter && (
									<button
										onClick={goToNextChapter}
										className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 text-white text-sm font-medium rounded-full transition-all duration-200 hover:scale-105 active:scale-95 border border-white/10 hover:border-white/20"
										aria-label={`Next: ${nextChapter.chap ? `Ch ${nextChapter.chap}` : nextChapter.title || 'Chapter'}`}
									>
										<span className="text-white/90">
											{nextChapter.chap ? `Ch ${nextChapter.chap}` : 'Next'}
										</span>
										<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
										</svg>
									</button>
								)}
							</div>
						</div>
					</div>
				</div>,
				document.body
			)}
			</div>

			{/* Chapter Navigation Buttons - Desktop Draggable (Portal) */}
			{(nextChapter || prevChapter) && createPortal(
				<div 
					ref={desktopNavRef}
					className={`hidden md:block fixed rounded-full z-50 select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
					style={{ 
						position: 'fixed',
						left: navPosition.x || '50%',
						top: navPosition.y || 'auto',
						bottom: navPosition.y ? 'auto' : '16px',
						transform: navPosition.x ? 'none' : 'translateX(-50%)',
						zIndex: 9999
					}}
					onMouseDown={handleMouseDown}
					onTouchStart={handleTouchStart}
				>
					<div className="bg-black/90 backdrop-blur-lg border border-white/10 rounded-full p-2 md:p-3 shadow-2xl max-w-xs sm:max-w-sm md:max-w-none">
						{/* Drag handle indicator */}
						<div className="flex justify-center mb-1">
							<div className="w-8 h-1 bg-white/20 rounded-full"></div>
						</div>
						<div className="flex items-center gap-2 sm:gap-4 md:gap-6">
							{/* Previous Chapter Button */}
							<div className={`transition-all duration-300 ${prevChapter ? 'opacity-100 scale-100' : 'opacity-0 scale-95 w-0 overflow-hidden'}`}>
								{prevChapter && (
									<button
										onClick={goToPrevChapter}
										className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 bg-white/5 hover:bg-white/10 text-white text-xs sm:text-sm font-medium rounded-full transition-all duration-200 hover:scale-105 active:scale-95 border border-white/10 hover:border-white/20"
										aria-label={`Previous: ${prevChapter.chap ? `Ch ${prevChapter.chap}` : prevChapter.title || 'Chapter'}`}
									>
										<svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
										</svg>
										<span className="text-white/90 hidden sm:inline">
											{prevChapter.chap ? `Ch ${prevChapter.chap}` : 'Prev'}
										</span>
										<span className="text-white/90 sm:hidden">
											{prevChapter.chap ? prevChapter.chap : '←'}
										</span>
									</button>
								)}
							</div>
							
							{/* Chapter Info */}
							<div className="flex items-center gap-1 sm:gap-2 md:gap-3 text-white/70 text-xs sm:text-sm">
								{/* Hide left divider if on first chapter */}
								{currentChapterIndex > 0 && (
									<div className="h-4 sm:h-6 w-px bg-white/20"></div>
								)}
								<span className="px-2 sm:px-3 py-1 sm:py-1.5 bg-white/10 rounded-full font-medium text-white/90">
									{currentChapterIndex >= 0 && allChapters[currentChapterIndex] 
										? `Ch ${allChapters[currentChapterIndex].chap || allChapters[currentChapterIndex].title || '?'}` 
										: '?'} / {allChapters.length}
								</span>
								{mangaInfo && (
									<span className="text-xs text-white/50 max-w-16 sm:max-w-24 md:max-w-32 truncate hidden sm:block">
										{mangaInfo.title}
									</span>
								)}
								{/* Hide right divider if on last chapter */}
								{currentChapterIndex < allChapters.length - 1 && (
									<div className="h-4 sm:h-6 w-px bg-white/20"></div>
								)}
							</div>
							
							{/* Next Chapter Button */}
							<div className={`transition-all duration-300 ${nextChapter ? 'opacity-100 scale-100' : 'opacity-0 scale-95 w-0 overflow-hidden'}`}>
								{nextChapter && (
									<button
										onClick={goToNextChapter}
										className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 bg-white/5 hover:bg-white/10 text-white text-xs sm:text-sm font-medium rounded-full transition-all duration-200 hover:scale-105 active:scale-95 border border-white/10 hover:border-white/20"
										aria-label={`Next: ${nextChapter.chap ? `Ch ${nextChapter.chap}` : nextChapter.title || 'Chapter'}`}
									>
										<span className="text-white/90 hidden sm:inline">
											{nextChapter.chap ? `Ch ${nextChapter.chap}` : 'Next'}
										</span>
										<span className="text-white/90 sm:hidden">
											{nextChapter.chap ? nextChapter.chap : '→'}
										</span>
										<svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
										</svg>
									</button>
								)}
							</div>
						</div>
					</div>
				</div>,
				document.body
			)}
		</>
	)
}

// Memoize the component to prevent unnecessary re-renders
const MemoizedMangaReaderPage = React.memo(MangaReaderPage, (prevProps, nextProps) => {
	// Only re-render if essential props change
	return true // No props to compare, so always return true to prevent re-renders
});

export default MemoizedMangaReaderPage
