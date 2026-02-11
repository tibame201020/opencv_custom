package custom.tibame201020.adbOpenCv.workflow;

import java.util.*;
import java.util.function.Function;
import java.util.function.Predicate;

/**
 * n8n workflow POC - 驗證簡易工作流引擎架構
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
        Workflow workflow = new Workflow();
        
        WorkflowNode node1 = WorkflowNode.createConvertNode("n1", "toUpperCase", 
            s -> ((String)s).toUpperCase());
        WorkflowNode node2 = WorkflowNode.createConvertNode("n2", "appendHash",
            s -> s + "#");
        
        workflow.addNode(node1).addNode(node2)
                .addEdge(new WorkflowEdge("e1", "n1", "n2", "success"));
        
        ExecutionResult result = new FlowEngine(workflow).execute("hello");
        System.out.println("Input: hello");
        System.out.println("Output: " + result.output());
        System.out.println("Execution path: " + result.executionPath());
        System.out.println();
    }

    static void demo2ConvertAndIfWorkflow() {
        System.out.println("--- Demo 2: Convert + If Workflow ---");
        Workflow workflow = new Workflow();
        
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
        ExecutionResult result1 = new FlowEngine(workflow).execute("HELLO WORLD");
        System.out.println("Input: HELLO WORLD -> Output: " + result1.output());
        
        System.out.println("--- Test 2: Short string ---");
        ExecutionResult result2 = new FlowEngine(workflow).execute("HI");
        System.out.println("Input: HI -> Output: " + result2.output());
        System.out.println();
    }

    static void demo3SubWorkflowAsNode() {
        System.out.println("--- Demo 3: Sub Workflow as Node (For Loop Demo) ---");
        
        Workflow subWorkflow = new Workflow();
        subWorkflow.addNode(WorkflowNode.createConvertNode("sub1", "uppercase", 
                s -> ((String)s).toUpperCase()))
                   .addNode(WorkflowNode.createConvertNode("sub2", "addUnderscore", 
                s -> s + "_"))
                   .addEdge(new WorkflowEdge("subE1", "sub1", "sub2", "success"));
        
        Workflow mainWorkflow = new Workflow();
        WorkflowNode subNode = WorkflowNode.createSubWorkflowNode("subWf", "forEachChar", 
            subWorkflow, input -> {
                String s = (String) input;
                StringBuilder result = new StringBuilder();
                for (String ch : s.split("")) {
                    result.append(new FlowEngine(subWorkflow).execute(ch).output());
                }
                return result.toString();
            });
        
        mainWorkflow.addNode(WorkflowNode.createConvertNode("m1", "init", s -> "input:" + s))
                    .addNode(subNode)
                    .addEdge(new WorkflowEdge("e1", "m1", "subWf", "success"));
        
        ExecutionResult result = new FlowEngine(mainWorkflow).execute("abc");
        System.out.println("Input: abc");
        System.out.println("Output: " + result.output());
        System.out.println("Execution path: " + result.executionPath());
        System.out.println();
    }

    static void demo4CaseWhenWithSubWorkflow() {
        System.out.println("--- Demo 4: Case When with Sub Workflow ---");
        
        Workflow caseEven = new Workflow();
        caseEven.addNode(WorkflowNode.createConvertNode("ce1", "toEvenMsg", 
            input -> "EVEN: " + input));
        
        Workflow caseOdd = new Workflow();
        caseOdd.addNode(WorkflowNode.createConvertNode("co1", "toOddMsg", 
            input -> "ODD: " + input));
        
        Workflow caseThree = new Workflow();
        caseThree.addNode(WorkflowNode.createConvertNode("ct1", "toThreeMsg", 
            input -> "DIVISIBLE BY 3: " + input));
        
        Workflow mainWorkflow = new Workflow();
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
            System.out.println("Input: " + num + " -> Output: " + new FlowEngine(mainWorkflow).execute(num).output());
        }
        System.out.println();
    }
}

class WorkflowEdge {
    String id, fromNodeId, toNodeId, condition;
    WorkflowEdge(String id, String fromNodeId, String toNodeId, String condition) {
        this.id = id; this.fromNodeId = fromNodeId;
        this.toNodeId = toNodeId; this.condition = condition;
    }
    public String id() { return id; }
    public String fromNodeId() { return fromNodeId; }
    public String toNodeId() { return toNodeId; }
    public String condition() { return condition; }
}

class NodeOutput {
    boolean result; Object output;
    NodeOutput(boolean result, Object output) {
        this.result = result; this.output = output;
    }
    public boolean result() { return result; }
    public Object output() { return output; }
}

class NodeArg {
    Object input; Predicate<Object> predicate;
    NodeArg(Object input, Predicate<Object> predicate) {
        this.input = input; this.predicate = predicate;
    }
    public Object input() { return input; }
}

enum NodeType { CONVERT, IF, SUB_WORKFLOW }

class WorkflowNode {
    String id, name; public NodeType type; Node executor;
    public Workflow subWorkflow; Function<Object, Object> transformer;

    private WorkflowNode(String id, String name, NodeType type, Node executor, 
                        Workflow subWorkflow, Function<Object, Object> transformer) {
        this.id = id; this.name = name; this.type = type; this.executor = executor;
        this.subWorkflow = subWorkflow; this.transformer = transformer;
    }

    static WorkflowNode createConvertNode(String id, String name, Function<Object, Object> converter) {
        return new WorkflowNode(id, name, NodeType.CONVERT, 
            arg -> new NodeOutput(true, converter.apply(arg.input())), null, null);
    }

    static WorkflowNode createIfNode(String id, String name, Predicate<Object> condition) {
        return new WorkflowNode(id, name, NodeType.IF, 
            arg -> new NodeOutput(condition.test(arg.input()), arg.input()), null, null);
    }

    static WorkflowNode createSubWorkflowNode(String id, String name, Workflow subWorkflow, 
                                              Function<Object, Object> transformer) {
        return new WorkflowNode(id, name, NodeType.SUB_WORKFLOW, 
            arg -> new NodeOutput(true, transformer.apply(arg.input())), subWorkflow, transformer);
    }

    public String getId() { return id; }
    public Node getExecutor() { return executor; }
}

interface Node {
    NodeOutput execute(NodeArg arg);
}

class Workflow {
    Map<String, WorkflowNode> nodes = new LinkedHashMap<>();
    List<WorkflowEdge> edges = new ArrayList<>();
    String startNodeId;

    Workflow addNode(WorkflowNode node) {
        nodes.put(node.getId(), node);
        if (startNodeId == null) startNodeId = node.getId();
        return this;
    }

    Workflow addEdge(WorkflowEdge edge) {
        edges.add(edge);
        return this;
    }

    public Map<String, WorkflowNode> getNodes() { return nodes; }
    public List<WorkflowEdge> getEdges() { return edges; }
    public String getStartNodeId() { return startNodeId; }
}

class ExecutionResult {
    Object output; List<String> executionPath;
    ExecutionResult(Object output, List<String> executionPath) {
        this.output = output; this.executionPath = executionPath;
    }
    public Object output() { return output; }
    public List<String> executionPath() { return executionPath; }
}

class FlowEngine {
    Workflow workflow;
    FlowEngine(Workflow workflow) { this.workflow = workflow; }

    ExecutionResult execute(Object input) {
        List<String> executionPath = new ArrayList<>();
        Object currentData = input;
        String currentNodeId = workflow.getStartNodeId();

        while (currentNodeId != null) {
            executionPath.add(currentNodeId);
            WorkflowNode node = workflow.getNodes().get(currentNodeId);
            if (node == null) break;

            NodeOutput result;
            // 對 SUB_WORKFLOW 節點進行特殊處理
            if (node.type == NodeType.SUB_WORKFLOW && node.subWorkflow != null) {
                ExecutionResult subResult = new FlowEngine(node.subWorkflow).execute(currentData);
                result = new NodeOutput(true, subResult.output());
            } else {
                result = node.getExecutor().execute(new NodeArg(currentData, null));
            }
            
            currentData = result.output();
            currentNodeId = findNextNode(currentNodeId, result.result());
        }

        return new ExecutionResult(currentData, executionPath);
    }

    private String findNextNode(String currentNodeId, boolean conditionResult) {
        String condition = conditionResult ? "true" : "false";
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


