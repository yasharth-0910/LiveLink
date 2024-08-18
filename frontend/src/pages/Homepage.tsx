import { useNavigate } from 'react-router-dom';

export const Homepage = () => {

    const navigate = useNavigate();

    const start = () => {
        navigate('/start');
    };

    return (
        <div>
            <h1>Live Link</h1>
            <p>Connect With your Loved One, with just a click (well 2 actually), but yeah you get the point</p>
            <button onClick={start}>
                start
            </button>
        </div>
    )
}
