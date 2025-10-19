import { useAuth } from "@clerk/clerk-react"; 
import axios from "axios";
import { useState, useEffect ,useCallback} from "react";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "../Redux/store.js";
import { setOtherUsers, setSelectedUser, type User } from "../Redux/userSlice.js";
import {debounce} from 'lodash';
import { PiUser } from "react-icons/pi";
import { useTheme } from "../context/useTheme.js";
import { RxCross1 } from "react-icons/rx";

const Sidebar = () => {
    const {theme}=useTheme();
    const dispatch = useDispatch();
    const { getToken } = useAuth();
    const [searchUser,setSearchUser]=useState<User[]>();
    const [search, setSearch] = useState<string>("");
    const currentUser=useSelector((state:RootState)=>state.userSlice.currentUser);
    const friends = useSelector((state: RootState) => state.userSlice.otherUsers);
    // const messages=useSelector((state: RootState)=>state.messageSlice.messages);
    const {selectedUser,onlineUsers}=useSelector((state:RootState)=>state.userSlice);

    const changeSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearch(e.target.value);
        debouncedFetch(e.target.value);
    }

    const fetchUsers = async (query: string) => {
        if (!query) {
            setSearchUser([]);
            return;
        }
        try {
            const token = await getToken();
            const users = await axios.get(
                `${import.meta.env.VITE_BACKEND_URL}/api/users/search`,
                {
                    params: { search: query },
                    headers: { Authorization: `Bearer ${token}` }
                }
            );
            setSearchUser(users.data);
        } catch (err) {
            console.error("Search failed", err);
        }
    };

    const debouncedFetch = useCallback(debounce(fetchUsers, 500), []);

    useEffect(() => {
        return () => {
            debouncedFetch.cancel();
        };
    }, []);

    const handleSelectUser=(x:User)=>{
        dispatch(setSelectedUser(x));
        setSearchUser([]);
        setSearch("");
    }

    useEffect(() => {
        const fetchFriends = async () => {
            const token = await getToken();
            try {
                const result = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/users/getAllUsers`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (!result) throw new Error("Data not found");
                dispatch(setOtherUsers(result.data));
            } catch (error) {
                console.log(error);
            }
        }
        fetchFriends();
    }, [getToken,currentUser,dispatch]);
const handleCrossClick=()=>{
    setSearch("");
    setSearchUser([]);
}
    return (
        <div className={`lg:w-[30%] ${selectedUser?"hidden":"block"} relative lg:block w-full h-screen overflow-hidden 
            ${theme === 'light' ? 'bg-slate-200' : 'bg-gray-900 text-white'}`}>
            
            <div className={`w-full bg-gradient-to-r from-blue-400 to-indigo-500 h-[150px] shadow-lg ${theme==='light'?"shadow-gray-500":""}  
                rounded-b-[30%] flex items-center justify-start gap-3 flex-col`}>
                
                <form className={`w-[80%] flex p-4 h-[30%] 
                    ${theme === 'light' ? 'bg-white shadow-blue-500' : 'bg-gray-800 shadow-black'} 
                    shadow-lg mt-10 items-center justify-between rounded-full transition-all duration-300`}>
                    
                    <input 
                        type='text' 
                        name='search' 
                        value={search} 
                        placeholder="Search Friends..." 
                        onChange={changeSearch} 
                        className={`w-[80%] h-[35%] focus:outline-none rounded-2xl text-xl p-4 
                            ${theme === 'light' ? 'text-black' : 'text-white  placeholder-gray-400'}`} 
                    />
                    {
                        search && search.length !== 0 &&
                    <RxCross1 className="cursor-pointer text-md" onClick={handleCrossClick}/>
                    }

                    {searchUser && searchUser.length !== 0 && (
                        <div className={`flex flex-col gap-1 mt-5 absolute top-20 z-10 left-5 w-[94%] 
                            ${theme === 'light' ? 'bg-white/30' : 'bg-gray-800/50'} backdrop-blur-md rounded-xl overflow-auto`}>
                            {searchUser.map((x, index) => (
                                <div key={index} onClick={()=>handleSelectUser(x)} 
                                    className={`flex items-center p-3 h-[50px] gap-2 w-[100%] cursor-pointer 
                                        hover:bg-gradient-to-r from-blue-400 to-indigo-700 text-black'`}>
                                    
                                    <div className="w-8 h-8 rounded-full relative shadow-gray-500 shadow-lg">
                                        {x.image ? 
                                            <img src={x.image} className="w-full h-full rounded-full"/> : 
                                            <PiUser className="w-full h-full rounded-full"/>
                                        }
                                    </div>
                                    <div className="font-semibold">{x?.username}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </form> 
            </div>

            {/* List of friends */}
            {friends && friends.length !== 0 && (
                <div className="flex flex-col gap-1 mt-5 h-[50%] overflow-auto items-center">
                    {friends.map((x, index) => (
                        <div key={index} onClick={()=>dispatch(setSelectedUser(x))} 
                            className={`flex border-0 cursor-pointer rounded-full shadow-lg items-center p-3 h-[50px] gap-2 w-[97%]  
                                ${theme === 'light' ? 'bg-gray-100 text-black hover:bg-gradient-to-r from-blue-200 to-indigo-300' 
                                                    : 'bg-gray-800  text-white hover:bg-gradient-to-r from-blue-200 to-indigo-300 hover:text-black '}`}>
                            
                            <div className={`w-8 h-8 rounded-full relative ${theme==='dark'?"":"shadow-gray-500"}  shadow-lg`}>
                                {x.image ? 
                                    <img src={x.image} className="w-full h-full rounded-full"/> : 
                                    <PiUser className="w-full h-full rounded-full"/>
                                }
                                {onlineUsers.includes(x._id) && (
                                    <div className="absolute right-0 bottom-0.5 w-2 h-2 bg-[#6fff00f4] rounded-full"></div>
                                )}
                            </div>
                            <div className="font-semibold">{x?.username}</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export default Sidebar;
