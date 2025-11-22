import clsx from 'clsx';

const Skeleton = ({ className }) => {
    return <div className={clsx("animate-pulse bg-gray-800 rounded", className)} />;
};

export default Skeleton;
