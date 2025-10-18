import { useEffect, useRef,useState } from "react";
import {BsCheck2All } from "react-icons/bs";
import type { Message } from "../Redux/messageSlice";

const SenderMessage = (props: Message) => {
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
        // 1. Parent is the positioning anchor
        <div ref={scroll} className='relative w-fit max-w-[500px] self-end rounded-tr-none rounded-xl bg-indigo-500 px-3 py-2 text-white shadow-md'>

            {/* Main Content Area */}
            {props?.image && (
                <img
                    src={props.image}
                    alt="attachment"
                    className="mb-2 h-40 w-40 rounded-lg" // Added margin-bottom
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
                // 2. Add padding to the right to make space for the timestamp
                <span className="pr-16">{props.message}</span>
            )}

            {/* 3. Timestamp & Status Icon Container */}
            <div className="absolute bottom-0.5 right-2 flex items-center gap-1">
                <p className="text-xs text-indigo-200">{messageTime}</p>
                
                {/* 4. (Bonus) Conditionally render the icon based on status */}
                {props.status === 'sent' && <BsCheck2All className="text-base text-indigo-200" />}
                {props.status === 'read' && <BsCheck2All className="text-base text-red-300" />}
            </div>
        </div>
    )
}

export default SenderMessage;