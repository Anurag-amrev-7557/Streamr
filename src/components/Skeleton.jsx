import { memo } from 'react';
import clsx from 'clsx';

const Skeleton = memo(({ className }) => {
    return <div className={clsx("animate-pulse bg-gray-800 rounded", className)} />;
});

Skeleton.displayName = 'Skeleton';

export default Skeleton;

