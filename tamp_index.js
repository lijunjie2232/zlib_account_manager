// ==UserScript==
// @name         Z-Library 账号管理器
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  悬浮按钮管理Z-Library多个账号，支持切换、保存和编辑账号信息
// @author       Assistant
// @match        *://z-library.sk/*
// @match        *://*.z-library.sk/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_addStyle
// ==/UserScript==

(function () {
  "use strict";

  // 加载保存的账号数据
  let accounts = JSON.parse(GM_getValue("zlib_accounts", "[]"));
  let currentAccountIndex = GM_getValue("zlib_current_account", -1);
  let isManagerVisible = false;

  // 添加样式
  GM_addStyle(`
        .zlib-floating-btn {
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 60px;
            height: 60px;
            background: #1E90FF;
            color: white;
            border: none;
            border-radius: 50%;
            font-size: 14px;
            font-weight: bold;
            cursor: pointer;
            box-shadow: 0 4px 8px rgba(0,0,0,0.3);
            z-index: 10000;
            transition: all 0.3s ease;
        }
        .zlib-floating-btn:hover {
            background: #187bcd;
            transform: scale(1.1);
        }
        .zlib-account-manager {
            position: fixed;
            bottom: 90px;
            right: 20px;
            width: 350px;
            background: white;
            border: 1px solid #ddd;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            padding: 15px;
            display: none;
        }
        .zlib-account-manager.visible {
            display: block;
        }
        .zlib-account-item {
            padding: 10px;
            border: 1px solid #eee;
            margin: 8px 0;
            border-radius: 4px;
            cursor: pointer;
        }
        .zlib-account-item:hover {
            background: #f5f5f5;
        }
        .zlib-account-item.active {
            background: #e3f2fd;
            border-color: #1E90FF;
        }
        .zlib-account-alias {
            font-weight: bold;
            color: #333;
        }
        .zlib-account-email {
            font-size: 12px;
            color: #666;
        }
        .zlib-btn {
            padding: 8px 12px;
            margin: 5px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            float: right;
        }
        .zlib-btn-primary {
            background: #1E90FF;
            color: white;
        }
        .zlib-btn-danger {
            background: #ff4757;
            color: white;
        }
        .zlib-btn-success {
            background: #2ed573;
            color: white;
        }
        .zlib-form-group {
            margin: 10px 0;
        }
        .zlib-form-input {
            width: 100%;
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
            box-sizing: border-box;
        }
        .zlib-manager-header {
            display: flex;
            justify-content: between;
            align-items: center;
            margin-bottom: 15px;
        }
        .zlib-manager-title {
            font-size: 16px;
            font-weight: bold;
            color: #333;
        }
        .zlib-account-actions {
            display: flex;
            gap: 5px;
            margin-top: 5px;
        }
    `);

  // 创建悬浮按钮
  const createFloatingButton = () => {
    const btn = document.createElement("button");
    btn.className = "zlib-floating-btn";
    btn.textContent = "账号";
    btn.title = "Z-Library 账号管理器";

    btn.addEventListener("click", toggleAccountManager);

    document.body.appendChild(btn);
    return btn;
  };

  // 创建账号管理器界面
  const createAccountManager = () => {
    const manager = document.createElement("div");
    manager.className = "zlib-account-manager";
    manager.id = "zlib-account-manager";

    document.body.appendChild(manager);
    return manager;
  };

  // 切换账号管理器显示/隐藏
  const toggleAccountManager = () => {
    const manager = document.getElementById("zlib-account-manager");
    if (!manager) return;

    if (isManagerVisible) {
      manager.classList.remove("visible");
    } else {
      renderAccountManager();
      manager.classList.add("visible");
    }
    isManagerVisible = !isManagerVisible;
  };

  // 渲染账号管理器内容
  const renderAccountManager = () => {
    const manager = document.getElementById("zlib-account-manager");
    if (!manager) return;

    manager.innerHTML = `
            <div class="zlib-manager-header">
                <div class="zlib-manager-title">账号管理</div>
            </div>
            <div id="zlib-accounts-list"></div>
            <div style="margin-top: 15px; padding-top: 10px; border-top: 1px solid #eee;">
                <button class="zlib-btn" id="zlib-close-manager">关闭</button>
                <button class="zlib-btn zlib-btn-success" id="zlib-add-account">添加账号</button>
            </div>
        `;

    renderAccountsList();

    // 添加事件监听器
    document
      .getElementById("zlib-add-account")
      .addEventListener("click", showAccountForm);
    document
      .getElementById("zlib-close-manager")
      .addEventListener("click", toggleAccountManager);
  };

  // 渲染账号列表
  const renderAccountsList = () => {
    const accountsList = document.getElementById("zlib-accounts-list");
    if (!accountsList) return;

    if (accounts.length === 0) {
      accountsList.innerHTML =
        '<div style="text-align: center; color: #666; padding: 20px;">暂无保存的账号</div>';
      return;
    }

    accountsList.innerHTML = accounts
      .map(
        (account, index) => `
            <div class="zlib-account-item ${
              index === currentAccountIndex ? "active" : ""
            }">
                <div class="zlib-account-alias">${
                  account.alias || "未命名账号"
                }</div>
                <div class="zlib-account-email">${account.email}</div>
                <div class="zlib-account-actions">
                    <button class="zlib-btn zlib-btn-primary" data-index="${index}" data-action="switch">切换</button>
                    <button class="zlib-btn" data-index="${index}" data-action="edit">编辑</button>
                    <button class="zlib-btn zlib-btn-danger" data-index="${index}" data-action="delete">删除</button>
                </div>
            </div>
        `
      )
      .join("");

    // 添加账号操作事件监听
    accountsList.querySelectorAll(".zlib-btn").forEach((btn) => {
      btn.addEventListener("click", handleAccountAction);
    });
  };

  // 处理账号操作
  const handleAccountAction = (event) => {
    const index = parseInt(event.target.getAttribute("data-index"));
    const action = event.target.getAttribute("data-action");

    switch (action) {
      case "switch":
        switchAccount(index);
        break;
      case "edit":
        showAccountForm(index);
        break;
      case "delete":
        deleteAccount(index);
        break;
    }
  };

  // 切换账号
  const switchAccount = async (index) => {
    if (index < 0 || index >= accounts.length) return;

    const account = accounts[index];

    try {
      const response = await fetch("https://z-library.sk/rpc.php", {
        headers: {
          Referer: "https://z-library.sk/",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `isModal=true&email=${encodeURIComponent(
          account.email
        )}&password=${encodeURIComponent(
          account.password
        )}&site_mode=books&action=login&redirectUrl=https%3A%2F%2Fja.z-library.sk%2F&gg_json_mode=1`,
        method: "POST",
      });

      if (response.ok) {
        currentAccountIndex = index;
        GM_setValue("zlib_current_account", currentAccountIndex);

        // 更新界面
        renderAccountsList();

        // 显示成功消息
        showMessage(
          `已切换到账号: ${account.alias || account.email}`,
          "success"
        );

        // 3秒后刷新页面
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      showMessage(`登录失败: ${error.message}`, "error");
    }
  };

  // 显示账号表单（添加或编辑）
  const showAccountForm = (index = -1) => {
    const isEdit = index >= 0;
    const account = isEdit
      ? accounts[index]
      : { alias: "", email: "", password: "" };

    const manager = document.getElementById("zlib-account-manager");
    manager.innerHTML = `
            <div class="zlib-manager-header">
                <div class="zlib-manager-title">${
                  isEdit ? "编辑账号" : "添加账号"
                }</div>
            </div>
            <form id="zlib-account-form">
                <div class="zlib-form-group">
                    <label>别名（可选）:</label>
                    <input type="text" class="zlib-form-input" id="zlib-alias"
                           value="${
                             account.alias
                           }" placeholder="为账号起个名字">
                </div>
                <div class="zlib-form-group">
                    <label>邮箱:</label>
                    <input type="email" class="zlib-form-input" id="zlib-email"
                           value="${account.email}" required>
                </div>
                <div class="zlib-form-group">
                    <label>密码:</label>
                    <input type="password" class="zlib-form-input" id="zlib-password"
                           value="${account.password}" required>
                </div>
                <div style="margin-top: 15px;">
                    <button type="button" class="zlib-btn" id="zlib-cancel-form">取消</button>
                    <button type="submit" class="zlib-btn zlib-btn-primary">${
                      isEdit ? "更新" : "保存"
                    }</button>

                    <button type="button" class="zlib-btn zlib-btn-success" id="zlib-test-login">测试登录</button>
                </div>
            </form>
        `;
    // ${
    //   isEdit
    //     ? `<button type="button" class="zlib-btn zlib-btn-success" id="zlib-test-login">测试登录</button>`
    //     : ""
    // }
    const form = document.getElementById("zlib-account-form");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      saveAccount(index);
    });

    document
      .getElementById("zlib-cancel-form")
      .addEventListener("click", renderAccountManager);

    if (isEdit) {
      document
        .getElementById("zlib-test-login")
        .addEventListener("click", () => {
          testLogin(index);
        });
    }
  };

  // 保存账号
  const saveAccount = (index = -1) => {
    const alias = document.getElementById("zlib-alias").value.trim();
    const email = document.getElementById("zlib-email").value.trim();
    const password = document.getElementById("zlib-password").value;

    if (!email || !password) {
      showMessage("邮箱和密码不能为空", "error");
      return;
    }

    const accountData = { alias, email, password };

    if (index >= 0) {
      // 编辑现有账号
      accounts[index] = accountData;
    } else {
      // 添加新账号
      accounts.push(accountData);
    }

    GM_setValue("zlib_accounts", JSON.stringify(accounts));
    showMessage(`账号${index >= 0 ? "更新" : "保存"}成功`, "success");

    // 返回账号列表
    setTimeout(renderAccountManager, 1000);
  };

  // 删除账号
  const deleteAccount = (index) => {
    if (!confirm("确定要删除这个账号吗？")) return;

    accounts.splice(index, 1);

    // 如果删除的是当前账号，更新当前账号索引
    if (currentAccountIndex === index) {
      currentAccountIndex = -1;
      GM_setValue("zlib_current_account", -1);
    } else if (currentAccountIndex > index) {
      currentAccountIndex--;
      GM_setValue("zlib_current_account", currentAccountIndex);
    }

    GM_setValue("zlib_accounts", JSON.stringify(accounts));
    renderAccountsList();
    showMessage("账号已删除", "success");
  };

  // 测试登录
  const testLogin = async (index) => {
    const account = accounts[index];

    try {
      const response = await fetch("https://z-library.sk/rpc.php", {
        headers: {
          Referer: "https://z-library.sk/",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `isModal=true&email=${encodeURIComponent(
          account.email
        )}&password=${encodeURIComponent(
          account.password
        )}&site_mode=books&action=login&redirectUrl=https%3A%2F%2Fja.z-library.sk%2F&gg_json_mode=1`,
        method: "POST",
      });

      if (response.ok) {
        showMessage("登录测试成功！", "success");
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      showMessage(`登录测试失败: ${error.message}`, "error");
    }
  };

  // 显示消息
  const showMessage = (message, type = "info") => {
    // 移除现有消息
    const existingMsg = document.getElementById("zlib-message");
    if (existingMsg) existingMsg.remove();

    const msg = document.createElement("div");
    msg.id = "zlib-message";
    msg.textContent = message;
    msg.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 100px;
            padding: 20px 24px;
            border-radius: 4px;
            height: 60px;
            color: white;
            font-size: 16px;
            z-index: 10001;
            background: ${
              type === "success"
                ? "#2ed573"
                : type === "error"
                ? "#ff4757"
                : "#1E90FF"
            };
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        `;

    document.body.appendChild(msg);

    // 触发入场动画
    setTimeout(() => {
      msg.style.opacity = "1";
      msg.style.transform = "translateX(0)";
    }, 10);

    // 3秒后自动消失动画
    setTimeout(() => {
      msg.style.opacity = "0";
      msg.style.transform = "translateX(100%)";
      setTimeout(() => msg.remove(), 300);
    }, 3000);
  };

  // 初始化
  const init = () => {
    createFloatingButton();
    createAccountManager();

    // 如果保存了当前账号，自动显示当前账号信息
    if (currentAccountIndex >= 0 && currentAccountIndex < accounts.length) {
      const currentAccount = accounts[currentAccountIndex];
      showMessage(
        `当前账号: ${currentAccount.alias || currentAccount.email}`,
        "info"
      );
    }
  };

  // 页面加载完成后初始化
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
