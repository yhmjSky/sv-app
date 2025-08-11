<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';

	export let data: PageData;

	let newUserAge = 25;
	let isCreating = false;
	let selectedDatabase = data.currentDatabase?.key || data.defaultDatabaseKey;

	// 新建数据库相关变量
	let showCreateDatabase = false;
	let newDbYear = new Date().getFullYear();
	let newDbMonth = new Date().getMonth() + 1;
	let isCreatingDatabase = false;

	// 创建表相关变量
	let showCreateTable = false;
	let tableName = '';
	let tableColumns: Array<{name: string, type: string, isPrimary: boolean, isRequired: boolean}> = [
		{name: 'id', type: 'integer', isPrimary: true, isRequired: true}
	];
	let isCreatingTable = false;

	// 结果显示相关变量
	let showResult = false;
	let resultData: any = null;

	// 可用的数据类型
	const columnTypes = ['integer', 'text', 'real', 'blob'];

	// 当数据库选择改变时，更新 URL 并重新加载数据
	async function onDatabaseChange() {
		const url = new URL(window.location.href);
		if (selectedDatabase === data.defaultDatabaseKey) {
			url.searchParams.delete('database');
		} else {
			url.searchParams.set('database', selectedDatabase);
		}
		await goto(url.pathname + url.search, { replaceState: true });
	}

	async function createDatabase() {
		isCreatingDatabase = true;
		try {
			const response = await fetch('/api/databases', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					year: newDbYear,
					month: newDbMonth
				})
			});

			const result = await response.json() as {
				success: boolean;
				error?: string;
				data?: any;
				steps?: string[];
				message?: string;
				info?: any;
			};

			// 保存结果数据并显示结果模态框
			resultData = result;
			showResult = true;
		} catch (error) {
			alert('❌ 网络错误: ' + error);
		} finally {
			isCreatingDatabase = false;
			showCreateDatabase = false;
		}
	}

	// 添加新列
	function addColumn() {
		tableColumns = [...tableColumns, {
			name: '',
			type: 'text',
			isPrimary: false,
			isRequired: false
		}];
	}

	// 删除列
	function removeColumn(index: number) {
		if (tableColumns.length > 1) {
			tableColumns = tableColumns.filter((_, i) => i !== index);
		}
	}

	// 创建表
	async function createTable() {
		if (!tableName.trim()) {
			alert('请输入表名');
			return;
		}

		if (tableColumns.some(col => !col.name.trim())) {
			alert('请填写所有列名');
			return;
		}

		isCreatingTable = true;
		try {
			// 生成 SQL
			const sql = generateCreateTableSQL();

			const response = await fetch('/api/tables', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					database: selectedDatabase,
					sql: sql,
					tableName: tableName
				})
			});

			const result = await response.json() as {
				success: boolean;
				error?: string;
				message?: string;
			};

			if (result.success) {
				alert(`✅ 表 "${tableName}" 创建成功！`);
				showCreateTable = false;
				// 重置表单
				tableName = '';
				tableColumns = [{name: 'id', type: 'integer', isPrimary: true, isRequired: true}];
				// 刷新页面
				window.location.reload();
			} else {
				alert(`❌ 创建表失败: ${result.error || 'Unknown error'}`);
			}
		} catch (error) {
			alert('❌ 网络错误: ' + error);
		} finally {
			isCreatingTable = false;
		}
	}

	// 生成 CREATE TABLE SQL
	function generateCreateTableSQL(): string {
		const columns = tableColumns.map(col => {
			let columnDef = `\`${col.name}\` ${col.type}`;
			if (col.isPrimary) columnDef += ' PRIMARY KEY';
			if (col.isRequired && !col.isPrimary) columnDef += ' NOT NULL';
			return columnDef;
		}).join(',\n\t');

		return `CREATE TABLE \`${tableName}\` (\n\t${columns}\n);`;
	}

	async function createUser() {
		isCreating = true;
		try {
			const url = new URL('/api/users', window.location.origin);
			if (selectedDatabase !== data.defaultDatabaseKey) {
				url.searchParams.set('database', selectedDatabase);
			}

			const response = await fetch(url.toString(), {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ age: newUserAge })
			});

			const result = await response.json() as { success: boolean; error?: string };

			if (result.success) {
				// 刷新页面以显示新用户
				window.location.reload();
			} else {
				alert('Failed to create user: ' + (result.error || 'Unknown error'));
			}
		} catch (error) {
			alert('Error creating user: ' + error);
		} finally {
			isCreating = false;
		}
	}
</script>

<div class="container mx-auto p-8 max-w-7xl">
	<h1 class="text-4xl font-bold mb-8 text-center text-gray-800">Cloudflare D1 数据库管理平台</h1>

	<!-- 数据库选择器 -->
	<div class="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 mb-8 shadow-sm">
		<h2 class="text-xl font-semibold mb-4 text-gray-800">数据库版本管理</h2>

		<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
			<div>
				<label for="database-select" class="block text-sm font-medium text-gray-700 mb-2">
					选择数据库版本
				</label>
				<select
					id="database-select"
					bind:value={selectedDatabase}
					on:change={onDatabaseChange}
					class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
				>
					{#if data.databases && data.databases.length > 0}
						{#each data.databases as db}
							<option value={db.key}>
								{db.displayName} {db.isDefault ? '(默认)' : ''}
							</option>
						{/each}
					{:else}
						<option value="">无可用数据库</option>
					{/if}
				</select>
			</div>

			<div class="flex flex-col justify-center">
				<div class="text-sm text-gray-600 mb-2">
					<strong>当前数据库:</strong>
					{data.currentDatabase?.displayName || '未选择'}
					{#if data.currentDatabase?.isDefault}
						<span class="text-green-600 font-medium">(当前月份默认)</span>
					{/if}
				</div>
			</div>

			<div class="flex flex-col justify-end space-y-3">
				<button
					on:click={() => showCreateDatabase = !showCreateDatabase}
					class="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors duration-200 font-medium"
				>
					{showCreateDatabase ? '取消创建数据库' : '新建数据库'}
				</button>
				<button
					on:click={() => showCreateTable = !showCreateTable}
					class="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors duration-200 font-medium"
				>
					{showCreateTable ? '取消创建表' : '创建新表'}
				</button>
			</div>
		</div>

		<!-- 新建数据库表单 -->
		{#if showCreateDatabase}
			<div class="mt-6 p-6 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl shadow-sm">
				<h3 class="text-lg font-semibold mb-4 text-gray-800">创建新数据库版本</h3>
				<form on:submit|preventDefault={createDatabase} class="grid grid-cols-1 md:grid-cols-3 gap-4">
					<div>
						<label for="new-db-year" class="block text-sm font-medium text-gray-700 mb-2">
							年份
						</label>
						<input
							id="new-db-year"
							type="number"
							bind:value={newDbYear}
							min="2020"
							max="2030"
							required
							class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
						/>
					</div>

					<div>
						<label for="new-db-month" class="block text-sm font-medium text-gray-700 mb-2">
							月份
						</label>
						<select
							id="new-db-month"
							bind:value={newDbMonth}
							required
							class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
						>
							{#each Array.from({length: 12}, (_, i) => i + 1) as month}
								<option value={month}>{month}月</option>
							{/each}
						</select>
					</div>

					<div class="flex items-end">
						<button
							type="submit"
							disabled={isCreatingDatabase}
							class="w-full bg-green-500 text-white py-3 px-4 rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 font-medium"
						>
							{isCreatingDatabase ? '创建中...' : '创建数据库'}
						</button>
					</div>
				</form>

				<div class="mt-4 p-3 bg-green-100 border border-green-300 rounded-lg text-sm text-green-800">
					<strong>💡 提示:</strong> 新数据库创建后需要在 wrangler.jsonc 中配置绑定，然后重新部署应用。
				</div>
			</div>
		{/if}

		<!-- 创建表表单 -->
		{#if showCreateTable}
			<div class="mt-6 p-6 bg-gradient-to-r from-purple-50 to-violet-50 border border-purple-200 rounded-xl shadow-sm">
				<h3 class="text-lg font-semibold mb-4 text-gray-800">创建新表</h3>

				<form on:submit|preventDefault={createTable} class="space-y-6">
					<!-- 表名输入 -->
					<div>
						<label for="table-name" class="block text-sm font-medium text-gray-700 mb-2">
							表名
						</label>
						<input
							id="table-name"
							type="text"
							bind:value={tableName}
							placeholder="例如: posts, comments, categories"
							required
							class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
						/>
					</div>

					<!-- 列定义 -->
					<div>
						<div class="flex justify-between items-center mb-3">
							<label class="block text-sm font-medium text-gray-700">
								列定义
							</label>
							<button
								type="button"
								on:click={addColumn}
								class="px-3 py-1 bg-purple-500 text-white text-sm rounded-md hover:bg-purple-600 transition-colors duration-200"
							>
								+ 添加列
							</button>
						</div>

						<div class="space-y-3">
							{#each tableColumns as column, index}
								<div class="grid grid-cols-1 md:grid-cols-5 gap-3 p-4 bg-white border border-gray-200 rounded-lg">
									<div>
										<label class="block text-xs font-medium text-gray-600 mb-1">列名</label>
										<input
											type="text"
											bind:value={column.name}
											placeholder="列名"
											required
											class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm"
										/>
									</div>

									<div>
										<label class="block text-xs font-medium text-gray-600 mb-1">数据类型</label>
										<select
											bind:value={column.type}
											class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm"
										>
											{#each columnTypes as type}
												<option value={type}>{type}</option>
											{/each}
										</select>
									</div>

									<div class="flex items-center justify-center">
										<label class="flex items-center space-x-2">
											<input
												type="checkbox"
												bind:checked={column.isPrimary}
												class="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
											/>
											<span class="text-xs font-medium text-gray-600">主键</span>
										</label>
									</div>

									<div class="flex items-center justify-center">
										<label class="flex items-center space-x-2">
											<input
												type="checkbox"
												bind:checked={column.isRequired}
												disabled={column.isPrimary}
												class="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
											/>
											<span class="text-xs font-medium text-gray-600">必填</span>
										</label>
									</div>

									<div class="flex items-center justify-center">
										{#if tableColumns.length > 1}
											<button
												type="button"
												on:click={() => removeColumn(index)}
												class="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 transition-colors duration-200"
											>
												删除
											</button>
										{/if}
									</div>
								</div>
							{/each}
						</div>
					</div>

					<!-- SQL 预览 -->
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2">
							SQL 预览
						</label>
						<pre class="w-full p-4 bg-gray-100 border border-gray-300 rounded-lg text-sm font-mono overflow-x-auto">{tableName ? generateCreateTableSQL() : '请输入表名和列信息'}</pre>
					</div>

					<!-- 提交按钮 -->
					<div class="flex justify-end space-x-3">
						<button
							type="button"
							on:click={() => showCreateTable = false}
							class="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors duration-200 font-medium"
						>
							取消
						</button>
						<button
							type="submit"
							disabled={isCreatingTable || !tableName.trim()}
							class="px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 font-medium"
						>
							{isCreatingTable ? '创建中...' : '创建表'}
						</button>
					</div>
				</form>
			</div>
		{/if}
	</div>

	{#if data.error}
		<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
			<strong>Error:</strong> {data.error}
		</div>
	{/if}

	{#if !data.success}
		<div class="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
			<strong>Warning:</strong> Using fallback D1 API instead of Drizzle ORM
		</div>
	{/if}

	<div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
		<!-- 用户列表 -->
		<div class="bg-white shadow-lg rounded-xl p-6 border border-gray-100">
			<div class="flex items-center justify-between mb-6">
				<h2 class="text-2xl font-semibold text-gray-800">用户列表</h2>
				<span class="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
					{data.users.length} 个用户
				</span>
			</div>

			{#if data.users.length === 0}
				<div class="text-center py-12">
					<div class="text-gray-400 text-6xl mb-4">👥</div>
					<p class="text-gray-500 text-lg">暂无用户数据</p>
					<p class="text-gray-400 text-sm mt-2">使用右侧表单创建第一个用户</p>
				</div>
			{:else}
				<div class="space-y-3">
					{#each data.users as user}
						<div class="flex justify-between items-center p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200 hover:shadow-md transition-shadow duration-200">
							<div class="flex items-center space-x-3">
								<div class="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
									{user.id}
								</div>
								<span class="font-medium text-gray-800">用户 #{user.id}</span>
							</div>
							<div class="text-right">
								<span class="text-gray-600 text-sm">年龄</span>
								<div class="text-lg font-semibold text-gray-800">{user.age}</div>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<!-- 创建用户表单 -->
		<div class="bg-white shadow-lg rounded-xl p-6 border border-gray-100">
			<h2 class="text-2xl font-semibold mb-6 text-gray-800">创建新用户</h2>

			<form on:submit|preventDefault={createUser} class="space-y-6">
				<div>
					<label for="age" class="block text-sm font-medium text-gray-700 mb-2">
						年龄
					</label>
					<input
						id="age"
						type="number"
						bind:value={newUserAge}
						min="0"
						max="150"
						required
						class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
						placeholder="请输入年龄"
					/>
					<p class="text-xs text-gray-500 mt-1">年龄范围: 0-150</p>
				</div>

				<button
					type="submit"
					disabled={isCreating}
					class="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 px-4 rounded-lg hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium text-lg shadow-md"
				>
					{isCreating ? '创建中...' : '创建用户'}
				</button>
			</form>

			<div class="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
				<h3 class="text-sm font-medium text-blue-800 mb-2">💡 提示</h3>
				<p class="text-xs text-blue-700">
					新用户将被添加到当前选择的数据库中。切换数据库版本可以查看不同时期的用户数据。
				</p>
			</div>
		</div>
	</div>

	<!-- API 信息和统计 -->
	<div class="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-8">
		<!-- API 端点 -->
		<div class="bg-gradient-to-br from-gray-50 to-gray-100 p-6 rounded-xl border border-gray-200">
			<h3 class="text-xl font-semibold mb-4 text-gray-800">🔗 API 端点</h3>
			<div class="space-y-3">
				<div class="flex items-center space-x-3">
					<span class="px-2 py-1 bg-green-500 text-white text-xs rounded font-mono">GET</span>
					<code class="bg-white px-3 py-1 rounded border text-sm">/api/users</code>
					<span class="text-gray-600 text-sm">获取用户列表</span>
				</div>
				<div class="flex items-center space-x-3">
					<span class="px-2 py-1 bg-blue-500 text-white text-xs rounded font-mono">POST</span>
					<code class="bg-white px-3 py-1 rounded border text-sm">/api/users</code>
					<span class="text-gray-600 text-sm">创建新用户</span>
				</div>
				<div class="flex items-center space-x-3">
					<span class="px-2 py-1 bg-green-500 text-white text-xs rounded font-mono">GET</span>
					<code class="bg-white px-3 py-1 rounded border text-sm">/api/databases</code>
					<span class="text-gray-600 text-sm">获取数据库列表</span>
				</div>
				<div class="flex items-center space-x-3">
					<span class="px-2 py-1 bg-blue-500 text-white text-xs rounded font-mono">POST</span>
					<code class="bg-white px-3 py-1 rounded border text-sm">/api/databases</code>
					<span class="text-gray-600 text-sm">创建新数据库</span>
				</div>
				<div class="flex items-center space-x-3">
					<span class="px-2 py-1 bg-green-500 text-white text-xs rounded font-mono">GET</span>
					<code class="bg-white px-3 py-1 rounded border text-sm">/api/tables</code>
					<span class="text-gray-600 text-sm">获取表列表</span>
				</div>
				<div class="flex items-center space-x-3">
					<span class="px-2 py-1 bg-blue-500 text-white text-xs rounded font-mono">POST</span>
					<code class="bg-white px-3 py-1 rounded border text-sm">/api/tables</code>
					<span class="text-gray-600 text-sm">创建新表</span>
				</div>
			</div>
		</div>

		<!-- 系统状态 -->
		<div class="bg-gradient-to-br from-blue-50 to-indigo-100 p-6 rounded-xl border border-blue-200">
			<h3 class="text-xl font-semibold mb-4 text-gray-800">📊 系统状态</h3>
			<div class="space-y-4">
				<div class="flex justify-between items-center">
					<span class="text-gray-600">当前数据库</span>
					<span class="font-medium text-gray-800">{data.currentDatabase?.displayName || '未选择'}</span>
				</div>
				<div class="flex justify-between items-center">
					<span class="text-gray-600">可用数据库</span>
					<span class="font-medium text-gray-800">{data.databases?.length || 0} 个</span>
				</div>
				<div class="flex justify-between items-center">
					<span class="text-gray-600">用户总数</span>
					<span class="font-medium text-gray-800">{data.users?.length || 0} 个</span>
				</div>
				<div class="flex justify-between items-center">
					<span class="text-gray-600">系统状态</span>
					<span class="flex items-center space-x-2">
						<div class="w-2 h-2 bg-green-500 rounded-full"></div>
						<span class="font-medium text-green-600">正常运行</span>
					</span>
				</div>
			</div>
		</div>
	</div>

	<!-- 页脚 -->
	<div class="mt-12 text-center text-gray-500 text-sm">
		<p>Cloudflare D1 + Drizzle ORM 数据库管理平台</p>
		<p class="mt-1">支持多版本数据库管理、动态表创建和实时数据操作</p>
	</div>
</div>

<!-- 数据库创建结果模态框 -->
{#if showResult && resultData}
	<div
		class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
		role="dialog"
		aria-modal="true"
		tabindex="-1"
		on:click={() => showResult = false}
		on:keydown={(e) => e.key === 'Escape' && (showResult = false)}
	>
		<div class="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-96 overflow-y-auto">
			<div class="flex justify-between items-center mb-4">
				<h3 class="text-xl font-semibold">
					{resultData.success ? '✅ 数据库创建成功' : '❌ 数据库创建失败'}
				</h3>
				<button
					on:click={() => showResult = false}
					class="text-gray-500 hover:text-gray-700 text-2xl"
				>
					×
				</button>
			</div>

			{#if resultData.success}
				<div class="space-y-4">
					<div class="bg-green-50 border border-green-200 rounded p-3">
						<p class="text-green-800">{resultData.message}</p>
					</div>

					{#if resultData.data?.steps}
						<div>
							<h4 class="font-semibold mb-2">创建步骤:</h4>
							<ul class="space-y-1 text-sm">
								{#each resultData.data.steps as step}
									<li class="flex items-start">
										<span class="text-green-500 mr-2">✓</span>
										{step}
									</li>
								{/each}
							</ul>
						</div>
					{/if}

					<!-- 配置更新状态 -->
					{#if resultData.data?.configUpdated !== undefined}
						<div class="bg-{resultData.data.configUpdated ? 'green' : 'yellow'}-50 border border-{resultData.data.configUpdated ? 'green' : 'yellow'}-200 rounded p-3">
							{#if resultData.data.configUpdated}
								<div class="flex items-center">
									<span class="text-green-500 mr-2">✅</span>
									<p class="text-green-800 text-sm">
										<strong>配置已自动更新!</strong>
										{resultData.data.isNewBinding ? '新增了数据库绑定' : '更新了现有绑定'}到 wrangler.jsonc
									</p>
								</div>
							{:else}
								<div class="flex items-center">
									<span class="text-yellow-500 mr-2">⚠️</span>
									<p class="text-yellow-800 text-sm">
										<strong>配置更新失败</strong> - 请手动更新 wrangler.jsonc 配置
									</p>
								</div>
							{/if}
						</div>
					{/if}

					{#if resultData.data?.wranglerConfig}
						<div>
							<h4 class="font-semibold mb-2">
								{resultData.data?.configUpdated ? '参考配置 (已自动添加)' : 'Wrangler 配置'}:
							</h4>
							{#if !resultData.data?.configUpdated}
								<p class="text-sm text-gray-600 mb-2">请将以下配置添加到 wrangler.jsonc 的 d1_databases 数组中:</p>
							{/if}
							<pre class="bg-gray-100 p-3 rounded text-sm overflow-x-auto">{resultData.data.wranglerConfig}</pre>
						</div>
					{/if}

					<div class="bg-blue-50 border border-blue-200 rounded p-3">
						<p class="text-blue-800 text-sm">
							<strong>下一步:</strong>
							{#if resultData.data?.configUpdated}
								配置已自动更新，现在可以重新部署应用以使用新数据库。
							{:else}
								更新 wrangler.jsonc 配置后，重新部署应用以使用新数据库。
							{/if}
						</p>
					</div>
				</div>
			{:else}
				<div class="space-y-4">
					<div class="bg-red-50 border border-red-200 rounded p-3">
						<p class="text-red-800">{resultData.error}</p>
					</div>

					{#if resultData.steps}
						<div>
							<h4 class="font-semibold mb-2">执行步骤:</h4>
							<ul class="space-y-1 text-sm">
								{#each resultData.steps as step}
									<li class="flex items-start">
										<span class="text-gray-400 mr-2">•</span>
										{step}
									</li>
								{/each}
							</ul>
						</div>
					{/if}

					{#if resultData.info?.missingVars}
						<div class="bg-yellow-50 border border-yellow-200 rounded p-3">
							<p class="text-yellow-800 text-sm">
								<strong>缺少环境变量:</strong> {resultData.info.missingVars.join(', ')}
								<br>请查看 ENVIRONMENT_SETUP.md 了解配置方法。
							</p>
						</div>
					{/if}
				</div>
			{/if}

			<div class="mt-6 flex justify-end space-x-3">
				<button
					on:click={() => showResult = false}
					class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
				>
					关闭
				</button>
				{#if resultData.success}
					<button
						on:click={() => window.location.reload()}
						class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
					>
						刷新页面
					</button>
				{/if}
			</div>
		</div>
	</div>
{/if}
