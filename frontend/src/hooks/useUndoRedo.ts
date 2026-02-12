import { useState, useCallback } from 'react';
import type { Node, Edge } from '@xyflow/react';

interface HistoryState {
    nodes: Node[];
    edges: Edge[];
}

export const useUndoRedo = () => {
    const [past, setPast] = useState<HistoryState[]>([]);
    const [future, setFuture] = useState<HistoryState[]>([]);

    const takeSnapshot = useCallback((nodes: Node[], edges: Edge[]) => {
        setPast((prev) => [...prev, { nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)) }]);
        setFuture([]);
    }, []);

    const undo = useCallback((
        currentNodes: Node[],
        currentEdges: Edge[],
        setNodes: (nodes: Node[]) => void,
        setEdges: (edges: Edge[]) => void
    ) => {
        setPast((prev) => {
            if (prev.length === 0) return prev;
            const newPast = [...prev];
            const previousState = newPast.pop();

            if (previousState) {
                setFuture((prevFuture) => [
                    ...prevFuture,
                    { nodes: JSON.parse(JSON.stringify(currentNodes)), edges: JSON.parse(JSON.stringify(currentEdges)) }
                ]);
                setNodes(previousState.nodes);
                setEdges(previousState.edges);
            }
            return newPast;
        });
    }, []);

    const redo = useCallback((
        currentNodes: Node[],
        currentEdges: Edge[],
        setNodes: (nodes: Node[]) => void,
        setEdges: (edges: Edge[]) => void
    ) => {
        setFuture((prev) => {
            if (prev.length === 0) return prev;
            const newFuture = [...prev];
            const nextState = newFuture.pop();

            if (nextState) {
                setPast((prevPast) => [
                    ...prevPast,
                    { nodes: JSON.parse(JSON.stringify(currentNodes)), edges: JSON.parse(JSON.stringify(currentEdges)) }
                ]);
                setNodes(nextState.nodes);
                setEdges(nextState.edges);
            }
            return newFuture;
        });
    }, []);

    return {
        takeSnapshot,
        undo,
        redo,
        canUndo: past.length > 0,
        canRedo: future.length > 0,
        history: { past, future } // Debugging
    };
};
