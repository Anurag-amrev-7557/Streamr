import React, { useEffect, useState, useRef } from 'react';
import MovieDetailsOverlay from './MovieDetailsOverlay';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, A11y } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import { Link } from 'react-router-dom';
import { getTrendingTVShows } from '../services/tmdbService';

// A lightweight top-ranked section that mimics the large-number-with-posters layout
export default function TopRankedSection({ title = 'Top 10 Series in Netflix Today' }) {
  // items: array of { id, title, poster, tag }
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const placeholder = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22240%22%20height%3D%22340%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Crect%20width%3D%22240%22%20height%3D%22340%22%20fill%3D%22%23303030%22/%3E%3C/text%3E%3C/svg%3E';

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getTrendingTVShows(1).then(res => {
      if (mounted && res && res.movies) {
        const topItems = res.movies.slice(0, 10).map(show => ({
          id: show.id,
          title: show.title,
          poster_path: show.poster,
          tag: show.rating >= 8.0 ? 'Trending' : null
        }));
        setItems(topItems);
      }
      setLoading(false);
    });
    return () => { mounted = false; };
  }, []);

  // Drag-to-scroll logic for desktop
  const scrollRef = useRef(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let isDown = false;
    let startX;
    let scrollLeft;
    const onMouseDown = (e) => {
      isDown = true;
      el.classList.add('dragging');
      startX = e.pageX - el.offsetLeft;
      scrollLeft = el.scrollLeft;
    };
    const onMouseLeave = () => {
      isDown = false;
      el.classList.remove('dragging');
    };
    const onMouseUp = () => {
      isDown = false;
      el.classList.remove('dragging');
    };
    const onMouseMove = (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - el.offsetLeft;
      const walk = (x - startX) * 1.5; // scroll speed
      el.scrollLeft = scrollLeft - walk;
    };
    el.addEventListener('mousedown', onMouseDown);
    el.addEventListener('mouseleave', onMouseLeave);
    el.addEventListener('mouseup', onMouseUp);
    el.addEventListener('mousemove', onMouseMove);
    return () => {
      el.removeEventListener('mousedown', onMouseDown);
      el.removeEventListener('mouseleave', onMouseLeave);
      el.removeEventListener('mouseup', onMouseUp);
      el.removeEventListener('mousemove', onMouseMove);
    };
  }, []);

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <section className="px-6" style={{ overflowY: 'hidden' }}>
      {/* Custom style to override swiper-slide min/max width for this section */}
      <style>{`
        @media (max-width: 768px) {
          .topranked-swiper-slide.swiper-slide {
            min-width: 310px !important;
            max-width: 310px !important;
            width: 310px !important;
          }
        }
      `}</style>
      <h2 className="text-xl font-semibold bg-gradient-to-r from-white via-white/90 to-white/60 bg-clip-text text-transparent relative mb-3">{title}</h2>
      {loading ? (
        <div className="flex flex-row gap-2 overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
          {[...Array(10)].map((_, idx) => (
            <div key={idx} style={{ width: 310, height: 280, flex: '0 0 auto', padding: 0, margin: 0 }} className="flex flex-row items-center mr-2">
              <div style={{ width: 60, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                <span style={{ fontSize: 200, fontWeight: 800, color: 'rgba(255,255,255,0.10)' }}>{idx + 1}</span>
              </div>
              <div className="rounded-lg overflow-hidden aspect-[2/3]" style={{ width: 160, height: 240, position: 'relative', zIndex: 2, background: 'linear-gradient(135deg, #232323 40%, #353535 60%)' }}>
                <div style={{position:'absolute',top:0,left:0,width:'100%',height:'100%',background:'linear-gradient(90deg,rgba(255,255,255,0.08) 0%,rgba(255,255,255,0.02) 100%)'}} />
                <div style={{position:'absolute',bottom:16,left:'50%',transform:'translateX(-50%)',width:'60%',height:'12px',borderRadius:'6px',background:'rgba(255,255,255,0.10)'}} />
                <div style={{position:'absolute',bottom:36,left:'50%',transform:'translateX(-50%)',width:'40%',height:'10px',borderRadius:'5px',background:'rgba(255,255,255,0.07)'}} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        isMobile ? (
          <div className="flex flex-row gap-2 overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
            {items.map((item, idx) => (
              <div key={item.id || idx} style={{ width: 310, height: 280, flex: '0 0 auto', padding: 0, margin: 0 }} className="flex flex-row items-center mr-2">
                {/* Large number to the left */}
                <div style={{ width: 60, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                  <span
                    style={{
                      fontSize: 200,
                      fontWeight: 800,
                          color: 'rgba(255,255,255,0.18)',
                          lineHeight: 1,
                          WebkitTextStroke: '2px rgba(255,255,255, 0.5)',
                          textShadow: 'none',
                          WebkitTextFillColor: 'rgba(0,0,0,0.9)',
                    }}
                  >
                    {idx + 1}
                  </span>
                </div>
                {/* Poster */}
                <div className="block group cursor-pointer" aria-label={item.title} onClick={() => setSelectedMovie(item)}>
                  <div className="rounded-lg overflow-hidden bg-black/20 aspect-[2/3]" style={{ width: 160, height: 240, position: 'relative', zIndex: 2 }}>
                    <img
                      src={item.poster_path || placeholder}
                      alt={item.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Swiper
            modules={[Navigation, A11y]}
            navigation
            spaceBetween={16}
            slidesPerView={'auto'}
             style={{ paddingRight: '3rem', marginRight: '2rem' }}
          >
            {items.map((item, idx) => (
              <SwiperSlide key={item.id || idx} style={{ width: 'auto', height: 320, flex: '0 0 auto', padding: 0, margin: 0 }}>
                <div className="flex flex-row items-center" style={{ height: 320, position: 'relative', padding: 0, marginRight: 16 }}>
                  {/* Large number to the left */}
                  <div style={{ marginRight: '-3rem', width: 150, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                      <span
                        style={{
                          fontSize: 230,
                          fontWeight: 800,
                          color: 'rgba(255,255,255,0.18)',
                          lineHeight: 1,
                          WebkitTextStroke: '2px rgba(255,255,255, 0.5)',
                          textShadow: 'none',
                          WebkitTextFillColor: 'rgba(0,0,0,0.9)',
                        }}
                      >
                        {idx + 1}
                      </span>
                  </div>
                  {/* Poster */}
                  <div className="block group cursor-pointer" aria-label={item.title} onClick={() => setSelectedMovie(item)}>
                    <div className="rounded-lg overflow-hidden bg-black/20" style={{ width: 190, height: 280, position: 'relative', zIndex: 2 }}>
                      <img
                        src={item.poster_path || placeholder}
                        alt={item.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      />
                    </div>
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        )
      )}
      {selectedMovie && (
        <MovieDetailsOverlay
          movie={{ ...selectedMovie, type: 'tv' }}
          onClose={() => setSelectedMovie(null)}
        />
      )}
    </section>
  );
}
