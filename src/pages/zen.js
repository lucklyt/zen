import * as React from 'react'
import {useEffect, useState} from 'react';
import { DecisionGraph, JdmConfigProvider,createJdmNode } from '@gorules/jdm-editor';
import '@gorules/jdm-editor/dist/style.css';
import axios from 'axios';
import { Button, Input, Switch, notification,Table,Tooltip,Tag } from 'antd';
import {diff} from 'deep-object-diff';
import {ruleContentShort } from './zen.module.css'

// Assuming CustomNodeSpecification is a function that takes an object defining the custom node
const addNameListNode =createJdmNode({
    kind: 'add_namelist',
    group: 'namelist',
    displayName: '添加名单数据',
    shortDescription: '添加数据到指定名单',
    inputs: [
        {
            control: 'text',
            name: 'list_name',
            label: '名单标识',
        },
        {
            control: 'text',
            name: 'dimension',
            label: '维度',
        },
        {
            control: 'text',
            name: 'value',
            label: '值',
        },
        {
            control: 'text',
            name: 'expires_at',
            label: '过期时间(0为永久)',
        },
    ],
})
const ZenPage = () => {
    const [graph, setGraph] = useState({});
    const [tests, setTests] = useState([]);
    const [version, setVersion] = useState('');
    const fetchRule = async () => {
        try {
            const effective_rule = await axios.get('http://localhost:9000/internal/api/v1/strategy/rules/effective?business=auth&scene=abnormal_signup');
            setGraph(effective_rule.data.data.rules);
            const formattedTests = effective_rule.data.data.test_cases.map(test => ({
                request: JSON.stringify(test.request, null, 2),
                expected: JSON.stringify(test.expected, null, 2),
                enabled: test.enabled ?? false, // Assuming 'enabled' might not be present in all tests
            }));
            setTests(formattedTests);
            setVersion(effective_rule.data.data.version);
        } catch (error) {
            notification.error({ message: 'Error fetching data', description: error.toString() });
        }
    };
    useEffect(() => {
        fetchRule().then(r => console.log(r));
    }, []);
    const [publishHistory, setPublishHistory] = useState([]);
    useEffect(() => {
        const fetchPublishHistory = async () => {
            try {
                const response = await axios.get('http://localhost:9000/internal/api/v1/strategy/publish_history?business=auth&scene=abnormal_signup');
                setPublishHistory(response.data.data.rules);
            } catch (error) {
                notification.error({ message: '获取发布历史失败', description: error.toString() });
            }
        };

        fetchPublishHistory();
    }, []);
    const addTest = () => {
        setTests([...tests, { request: '{}', expected: '{}', enabled: true }]);
        console.log(tests)
    };

    const deleteTest = (index) => {
        const newTests = [...tests];
        newTests.splice(index, 1);
        setTests(newTests);
    };

    const toggleDisable = (index) => {
        const newTests = [...tests];
        newTests[index].enabled = !newTests[index].enabled;
        setTests(newTests);
    };

    const updateTest = (index, field, value) => {
        const newTests = [...tests];
        newTests[index][field] = value;
        setTests(newTests);
    };

    const executeTest = async (index) => {
        const test = tests[index];
        const requestBody = {
            input: JSON.parse(test.request),
            rules: graph,
            dry_run: true,
        };
        try {
            const response = await axios.post('http://localhost:9000/internal/api/v1/strategy/evaluate_rules', requestBody);
            const result = response.data.data;
            console.log(result);
            const expected =JSON.parse(test.expected)
            console.log(expected)

            let dt = diff(expected, result)

            if (Object.keys(dt).length === 0 ) {
                notification.success({ message: '测试通过' });
            } else {
                notification.error({ message: '测试失败', description: JSON.stringify(dt, null, 2)});
            }
        } catch (error) {
            notification.error({ message: '测试执行错误', description: error.toString() });
        }
    };

    const publishData = async () => {
        const url = 'http://localhost:9000/internal/api/v1/strategy/publish_rules'; // Replace with your actual endpoint URL
        const parsedTests = tests.map(test => ({
            ...test,
            request: JSON.parse(test.request),
            expected: JSON.parse(test.expected),
        }));
        const payload = {
            "business": "auth",
            "scene": "abnormal_signup",
            "rules": graph,
            "test_cases": parsedTests,
        };

        try {
            const response = await axios.post(url, payload);
            if (response.data.is_succ){
                notification.success({ message: 'Publish Success' });
                console.log('success')
            }else{
                notification.error({ message: 'Publish Error', description: response.data.data.error_description});
                console.log('error ',response.data.error_message)
            }
        } catch (error) {
            console.error('Publish Error:', error);
            notification.error({ message: 'Publish Error', description: error.toString() });
        }
    };
    const rollback = async (recordVersion) => {
        try {
            const rsp = await axios.post('http://localhost:9000/internal/api/v1/strategy/rules/rollback', { business:"auth",scene:"abnormal_signup",  version: recordVersion });
            if (rsp.data.is_succ) {
                notification.success({message: 'Rollback successful'});
                window.location.reload();
            }else{
                throw new Error(rsp.data.data.error_description);
            }
        } catch (error) {
            notification.error({ message: 'Rollback failed', description: error.toString() });
        }
    };
    const columns = [
        {
            title: 'Rules',
            dataIndex: 'rules',
            key: 'rules',
            render: text => (
                <Tooltip title={JSON.stringify(text, null, 2)}>
                    <div className={ruleContentShort}>{JSON.stringify(text, null, 2)}</div>
                </Tooltip>
            )
        },
        {
            title: 'Test Cases',
            dataIndex: 'test_cases',
            key: 'test_cases',
            render: text => (
                <Tooltip title={JSON.stringify(text, null, 2)}>
                    <div className={ruleContentShort}>{JSON.stringify(text, null, 2)}</div>
                </Tooltip>
            )
        },
        {
            title: 'Version',
            dataIndex: 'version',
            key: 'version',
        },
        {
            title: 'Updated At',
            dataIndex: 'updated_at',
            key: 'updated_at',
        },
        {
            title: 'Action',
            key: 'action',
            render: (_, record) => (
                <div>
                    {version === record.version ? (
                        <Tag color="green">生效中</Tag>
                    ) : (
                        <Button onClick={() => rollback(record.version)}>回滚</Button>
                    )}
                    <Button onClick={() => handleViewHistory(record)}>查看</Button>
                </div>
            ),
        },
    ];

    const handleViewHistory = (history) => {
        setGraph(history.rules);
        const formattedTests = history.test_cases.map(test => ({
            enabled: test.enabled,
            request: JSON.stringify(test.request, null, 2),
            expected: JSON.stringify(test.expected, null, 2),
        }));
        setTests(formattedTests);
    };
    return  (
        <div style={{paddingBottom: '100px'}}>
            <h1>Auth>异常注册</h1>
            <h2> 规则编辑 </h2>
            <JdmConfigProvider>
                <DecisionGraph value={graph} onChange={setGraph} customNodes={[addNameListNode]}/>
            </JdmConfigProvider>
            <h3> 测试用例 </h3>
            <div>
                <Button onClick={addTest}>添加测试</Button>
                <Button onClick={publishData}>发布</Button>
                {tests.map((test, index) => (
                    <div key={index} style={{display: 'flex', alignItems: 'center', marginBottom: '10px'}}>
                        <Input.TextArea value={test.request}
                                        onChange={(e) => updateTest(index, 'request', e.target.value)}
                                        placeholder="预期请求JSON"/>
                        <Input.TextArea value={test.expected}
                                        onChange={(e) => updateTest(index, 'expected', e.target.value)}
                                        placeholder="预期输出JSON"/>
                        <Switch checked={!test.enabled} onChange={() => toggleDisable(index)}/>
                        <Button onClick={() => executeTest(index)}>执行</Button>
                        <Button onClick={() => deleteTest(index)}>删除</Button>
                    </div>
                ))}
            </div>
            <h2 style={{marginTop: '20px'}}>发布历史</h2>
            <div>
                <Table columns={columns} dataSource={publishHistory} rowKey="version"/>
            </div>
        </div>
    )
}
export default ZenPage