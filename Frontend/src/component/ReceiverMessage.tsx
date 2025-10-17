import { useEffect, useRef } from "react";
import type { Message } from "../Redux/messageSlice";

const ReceiverMessage = (props: Message) => {
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
                />
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