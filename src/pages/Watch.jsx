import { ArrowLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

const Watch = () => {
    const navigate = useNavigate();
    const { id } = useParams(); // eslint-disable-line no-unused-vars

    // Placeholder video logic
    const videoSrc = "https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&mute=1&controls=0&showinfo=0&rel=0&iv_load_policy=3&modestbranding=1";

    return (
        <div className="w-screen h-screen bg-black overflow-hidden relative">
            <div
                className="absolute top-4 left-4 z-50 cursor-pointer"
                onClick={() => navigate(-1)}
            >
                <ArrowLeft className="w-10 h-10 text-white hover:scale-110 transition" />
            </div>
            <iframe
                className="w-full h-full"
                src={videoSrc}
                title="Video Player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
            ></iframe>
        </div>
    );
};

export default Watch;
