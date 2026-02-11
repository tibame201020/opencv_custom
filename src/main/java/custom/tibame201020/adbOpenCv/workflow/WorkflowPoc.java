package custom.tibame201020.adbOpenCv.workflow;

import java.util.*;
import java.util.function.Function;
import java.util.function.Predicate;

/**
 * n8n workflow POC - 驗證簡易工作流引擎架構
 * 支援：1. Convert Node - 數據轉換節點
 * 2. If Node - 條件判斷節點
 * 3. Sub Workflow Node - 支援子工作流作為節點，用於組合 for/while/case 等
 */
public class WorkflowPoc {

    public static void main(String[] args) {
        System.out.println("=== n8n Workflow POC Demo ===\n");
        demo1SimpleConvertWorkflow();
        demo2ConvertAndIfWorkflow();
        demo3SubWorkflowAsNode();
        demo4CaseWhenWithSubWorkflow();
    }

    static void demo1SimpleConvertWorkflow() {
        System.out.println("--- Demo 1: Simple Convert Workflow ---");
        Workflow<Object, Object> workflow = new Workflow<>();
        
        WorkflowNode node1 = WorkflowNode.createConvertNode("n1", "toUpperCase", 
            s -> ((String)s).toUpperCase());
        WorkflowNode node2 = WorkflowNode.createConvertNode("n2", "appendHash",
            s -> s + "#");
        
        workflow.addNode(node1).addNode(node2)
                .addEdge(new WorkflowEdge("e1", "n1", "n2", "success"));
        
        ExecutionResult<Object> result = new FlowEngine<>(workflow).execute("hello");
        System.out.println("Input: hello");
        System.out.println("Output: " + result.output());
        System.out.println("Execution path: " + result.executionPath());
        System.out.println();
    }

    static void demo2ConvertAndIfWorkflow() {
        System.out.println("--- Demo 2: Convert + If Workflow ---");
        Workflow<Object, Object> workflow = new Workflow<>();
        
        WorkflowNode node1 = WorkflowNode.createConvertNode("n1", "toLowerCase",
            s -> ((String)s).toLowerCase());
        WorkflowNode nodeIf = WorkflowNode.createIfNode("nIf", "checkLength",
            s -> ((String)s).length() > 3);
        WorkflowNode nodePath1 = WorkflowNode.createConvertNode("nPath1", "appendStar",
            s -> s + "***");
        WorkflowNode nodePath2 = WorkflowNode.createConvertNode("nPath2", "appendDash",
            s -> s + "---");
        
        workflow.addNode(node1).addNode(nodeIf).addNode(nodePath1).addNode(nodePath2)
                .addEdge(new WorkflowEdge("e1", "n1", "nIf", "success"))
                .addEdge(new WorkflowEdge("e2", "nIf", "nPath1", "true"))
                .addEdge(new WorkflowEdge("e3", "nIf", "nPath2", "false"));
        
        System.out.println("--- Test 1: Long string ---");
        ExecutionResult<Object> result1 = new FlowEngine<>(workflow).execute("HELLO WORLD");
        System.out.println("Input: HELLO WORLD -> Output: " + result1.output());
        
        System.out.println("--- Test 2: Short string ---");
        ExecutionResult<Object> result2 = new FlowEngine<>(workflow).execute("HI");
        System.out.println("Input: HI -> Output: " + result2.output());
        System.out.println();
    }

    static void demo3SubWorkflowAsNode() {
        System.out.println("--- Demo 3: Sub Workflow as Node (For Loop Demo) ---");
        
        Workflow<Object, Object> subWorkflow = new Workflow<>();
        subWorkflow.addNode(WorkflowNode.createConvertNode("sub1", "uppercase", 
                s -> ((String)s).toUpperCase()))
                   .addNode(WorkflowNode.createConvertNode("sub2", "addUnderscore", 
                s -> s + "_"))
                   .addEdge(new WorkflowEdge("subE1", "sub1", "sub2", "success"));
        
        Workflow<Object, Object> mainWorkflow = new Workflow<>();
        WorkflowNode subNode = WorkflowNode.createSubWorkflowNode("subWf", "forEachChar", 
            subWorkflow, input -> {
                String s = (String) input;
                StringBuilder result = new StringBuilder();
                for (String ch : s.split("")) {
                    result.append(new FlowEngine<>(subWorkflow).execute(ch).output());
                }
                return result.toString();
            });
        
        mainWorkflow.addNode(WorkflowNode.createConvertNode("m1", "init", s -> "input:" + s))
                    .addNode(subNode)
                    .addEdge(new WorkflowEdge("e1", "m1", "subWf", "success"));
        
        ExecutionResult<Object> result = new FlowEngine<>(mainWorkflow).execute("abc");
        System.out.println("Input: abc");
        System.out.println("Output: " + result.output());
        System.out.println("Execution path: " + result.executionPath());
        System.out.println();
    }

    static void demo4CaseWhenWithSubWorkflow() {
        System.out.println("--- Demo 4: Case When with Sub Workflow ---");
        
        Workflow<Object, Object> caseEven = new Workflow<>();
        caseEven.addNode(WorkflowNode.createConvertNode("ce1", "toEvenMsg", 
            input -> "EVEN: " + input));
        
        Workflow<Object, Object> caseOdd = new Workflow<>();
        caseOdd.addNode(WorkflowNode.createConvertNode("co1", "toOddMsg", 
            input -> "ODD: " + input));
        
        Workflow<Object, Object> caseThree = new Workflow<>();
        caseThree.addNode(WorkflowNode.createConvertNode("ct1", "toThreeMsg", 
            input -> "DIVISIBLE BY 3: " + input));
        
        Workflow<Object, Object> mainWorkflow = new Workflow<>();
        mainWorkflow.addNode(WorkflowNode.createIfNode("if1", "isEven", 
            input -> ((Integer) input) % 2 == 0))
                    .addNode(WorkflowNode.createSubWorkflowNode("case1", "caseEven", caseEven, input -> input))
                    .addNode(WorkflowNode.createIfNode("if2", "isDivisibleBy3", 
            input -> ((Integer) input) % 3 == 0))
                    .addNode(WorkflowNode.createSubWorkflowNode("case2", "caseThree", caseThree, input -> input))
                    .addNode(WorkflowNode.createSubWorkflowNode("case3", "caseOdd", caseOdd, input -> input))
                    .addEdge(new WorkflowEdge("e1", "if1", "case1", "true"))
                    .addEdge(new WorkflowEdge("e2", "if1", "if2", "false"))
                    .addEdge(new WorkflowEdge("e3", "if2", "case2", "true"))
                    .addEdge(new WorkflowEdge("e4", "if2", "case3", "false"));
        
        System.out.println("--- Test numbers with case logic ---");
        for (int num : new int[]{2, 3, 9, 10}) {
            System.out.println("Input: " + num + " -> Output: " + new FlowEngine<>(mainWorkflow).execute(num).output());
        }
        System.out.println();
    }
}

// ========== 核心數據結構 ==========

/** 工作流邊 - 連接兩個節點 */
record WorkflowEdge(String id, String fromNodeId, String toNodeId, String condition) {}

/** 工作流節點執行結果 */
record NodeOutput<O>(boolean result, O output) {}

/** 節點輸入參數 */
record NodeArg<I>(I input, Predicate<I> predicate) {}

/** 工作流節點類型 */
enum NodeType { CONVERT, IF, SUB_WORKFLOW }

/**
 * 工作流節點 - 支持三種類型
 */
class WorkflowNode {
    private final String id;
    private final String name;
    public final NodeType type;
    private final Node<Object, Object> executor;
    public final Workflow<?, ?> subWorkflow;
    private final Function<Object, Object> transformer;

    private WorkflowNode(String id, String name, NodeType type, Node<Object, Object> executor, 
                        Workflow<?, ?> subWorkflow, Function<Object, Object> transformer) {
        this.id = id;
        this.name = name;
        this.type = type;
        this.executor = executor;
        this.subWorkflow = subWorkflow;
        this.transformer = transformer;
    }

    static WorkflowNode createConvertNode(String id, String name, Function<Object, Object> converter) {
        return new WorkflowNode(id, name, NodeType.CONVERT, 
            arg -> new NodeOutput<>(true, converter.apply(arg.input())), null, null);
    }

    static WorkflowNode createIfNode(String id, String name, Predicate<Object> condition) {
        return new WorkflowNode(id, name, NodeType.IF, 
            arg -> new NodeOutput<>(condition.test(arg.input()), arg.input()), null, null);
    }

    static WorkflowNode createSubWorkflowNode(String id, String name, Workflow<?, ?> subWorkflow, 
                                              Function<Object, Object> transformer) {
        return new WorkflowNode(id, name, NodeType.SUB_WORKFLOW, 
            arg -> new NodeOutput<>(true, transformer.apply(arg.input())), subWorkflow, transformer);
    }

    public String getId() { return id; }
    public Node<Object, Object> getExecutor() { return executor; }
}

/**
 * 函數式節點介面 - 支援泛型
 */
interface Node<I, O> {
    NodeOutput<O> execute(NodeArg<I> arg);
}

/**
 * 工作流定義 - 支援泛型
 */
class Workflow<I, O> {
    private final Map<String, WorkflowNode> nodes = new LinkedHashMap<>();
    private final List<WorkflowEdge> edges = new ArrayList<>();
    private String startNodeId;

    Workflow<I, O> addNode(WorkflowNode node) {
        nodes.put(node.getId(), node);
        if (startNodeId == null) startNodeId = node.getId();
        return this;
    }

    Workflow<I, O> addEdge(WorkflowEdge edge) {
        edges.add(edge);
        return this;
    }

    public Map<String, WorkflowNode> getNodes() { return nodes; }
    public List<WorkflowEdge> getEdges() { return edges; }
    public String getStartNodeId() { return startNodeId; }
}

/**
 * 工作流執行結果
 */
record ExecutionResult<O>(O output, List<String> executionPath) {}

/**
 * 工作流執行引擎 - 支援泛型
 */
class FlowEngine<I, O> {
    private final Workflow<I, O> workflow;

    FlowEngine(Workflow<I, O> workflow) {
        this.workflow = workflow;
    }

    ExecutionResult<O> execute(I input) {
        List<String> executionPath = new ArrayList<>();
        Object currentData = input;
        String currentNodeId = workflow.getStartNodeId();

        while (currentNodeId != null) {
            executionPath.add(currentNodeId);
            WorkflowNode node = workflow.getNodes().get(currentNodeId);
            if (node == null) break;

            NodeOutput<?> result;
            // 對 SUB_WORKFLOW 節點進行特殊處理
            if (node.type == NodeType.SUB_WORKFLOW && node.subWorkflow != null) {
                @SuppressWarnings("unchecked")
                ExecutionResult<Object> subResult = (ExecutionResult<Object>) new FlowEngine<Object, Object>(
                    (Workflow<Object, Object>) node.subWorkflow).execute(currentData);
                result = new NodeOutput<>(true, subResult.output());
            } else {
                result = node.getExecutor().execute(new NodeArg<>(currentData, null));
            }
            
            currentData = result.output();
            currentNodeId = findNextNode(currentNodeId, result.result());
        }

        @SuppressWarnings("unchecked")
        O finalOutput = (O) currentData;
        return new ExecutionResult<>(finalOutput, executionPath);
    }

    private String findNextNode(String currentNodeId, boolean conditionResult) {
        List<WorkflowEdge> edges1 = findEdges(currentNodeId, "true");
        List<WorkflowEdge> edges2 = findEdges(currentNodeId, "false");
        List<WorkflowEdge> edges3 = findEdges(currentNodeId, "success");
        
        if (conditionResult && !edges1.isEmpty()) return edges1.get(0).toNodeId();
        if (!conditionResult && !edges2.isEmpty()) return edges2.get(0).toNodeId();
        return edges3.isEmpty() ? null : edges3.get(0).toNodeId();
    }

    private List<WorkflowEdge> findEdges(String fromNodeId, String condition) {
        List<WorkflowEdge> result = new ArrayList<>();
        for (WorkflowEdge e : workflow.getEdges()) {
            if (e.fromNodeId().equals(fromNodeId) && e.condition().equals(condition))
                result.add(e);
        }
        return result;
    }
}


