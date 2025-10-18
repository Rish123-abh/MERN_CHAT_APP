import { useEffect, useRef,useState } from "react";
import type { Message } from "../Redux/messageSlice";

const ReceiverMessage = (props: Message) => {
    
    const [zoomImage, setZoomImage] = useState<string|null>(null);
    const date = new Date(props.updatedAt);
    const messageTime = (date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: 'numeric' }));
    const scroll = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scroll.current) {
            scroll.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [props.message, props.image]);

    return (
        // 1. Added 'relative' and 'text-white'
        <div ref={scroll} className='relative w-fit  max-w-[500px] self-start rounded-tl-none rounded-xl bg-[#5989e3] px-3 py-3  text-white shadow-md'>

            {/* Main Content Area */}
            {props?.image && (
                <img
                    src={props.image}
                    alt="attachment"
                    className="mb-1 h-40 w-40 rounded-lg"
                    onClick={()=>setZoomImage(props.image)}
                />
            )}
                        {/* Zoom modal */}
      {zoomImage && (
        <div
          className="fixed inset-0 bg-black/80 flex justify-center items-center z-50"
          onClick={() => setZoomImage(null)}
        >
          <img
            src={zoomImage}
            alt="zoomed"
            className="max-h-[90vh] max-w-[90vw] rounded-xl shadow-lg transition-transform duration-300 transform scale-100 hover:scale-105"
          />
        </div>
      )}
            {props?.message && (
                // 2. Added padding to make space for the timestamp
                <span className="pr-14">{props.message}</span>
            )}

            {/* 3. Timestamp Container */}
            <div className="absolute bottom-0.5 right-2">
                <p className="text-xs text-blue-200">{messageTime}</p>
            </div>
        </div>
    );
}

export default ReceiverMessage;