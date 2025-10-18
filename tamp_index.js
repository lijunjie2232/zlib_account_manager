// ==UserScript==
// @name         Z-Library Multi-Account Manager
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Floating button to manage multiple Z-Library accounts, supporting switching, saving, and editing account information
// @author       Assistant
// @match        *://*z-library.*/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_addStyle
// ==/UserScript==

(function () {
  "use strict";

  // Load saved account data
  let accounts = JSON.parse(GM_getValue("zlib_accounts", "[]"));
  let currentAccountIndex = GM_getValue("zlib_current_account", -1);
  let isManagerVisible = false;

  // Add styles
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
            font-size: 12px;
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
        /* New style: Set max height and scrollbar for account list */
        #zlib-accounts-list {
            max-height: 300px;
            overflow-y: auto;
            padding-right: 5px;
        }
        /* Optimize scrollbar style */
        #zlib-accounts-list::-webkit-scrollbar {
            width: 6px;
        }
        #zlib-accounts-list::-webkit-scrollbar-track {
            background: #f1f1f1;
            border-radius: 10px;
        }
        #zlib-accounts-list::-webkit-scrollbar-thumb {
            background: #c1c1c1;
            border-radius: 10px;
        }
        #zlib-accounts-list::-webkit-scrollbar-thumb:hover {
            background: #a1a1a1;
        }
    `);

  // Create floating button
  const createFloatingButton = () => {
    const btn = document.createElement("button");
    btn.className = "zlib-floating-btn";
    btn.textContent = "Account";
    btn.title = "Z-Library Account Manager";

    btn.addEventListener("click", toggleAccountManager);

    document.body.appendChild(btn);
    return btn;
  };

  // Create account manager interface
  const createAccountManager = () => {
    const manager = document.createElement("div");
    manager.className = "zlib-account-manager";
    manager.id = "zlib-account-manager";

    document.body.appendChild(manager);
    return manager;
  };

  // Toggle account manager show/hide
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

  // Render account manager content
  const renderAccountManager = () => {
    const manager = document.getElementById("zlib-account-manager");
    if (!manager) return;

    manager.innerHTML = `
            <div class="zlib-manager-header">
                <div class="zlib-manager-title">Account Management</div>
            </div>
            <div id="zlib-accounts-list"></div>
            <div style="margin-top: 15px; padding-top: 10px; border-top: 1px solid #eee;">
                <button class="zlib-btn" id="zlib-close-manager">Close</button>
                <button class="zlib-btn zlib-btn-success" id="zlib-add-account">Add Account</button>
            </div>
        `;

    renderAccountsList();

    // Add event listeners
    document
      .getElementById("zlib-add-account")
      .addEventListener("click", showAccountForm);
    document
      .getElementById("zlib-close-manager")
      .addEventListener("click", toggleAccountManager);
  };

  // Render account list
  const renderAccountsList = () => {
    const accountsList = document.getElementById("zlib-accounts-list");
    if (!accountsList) return;

    if (accounts.length === 0) {
      accountsList.innerHTML =
        '<div style="text-align: center; color: #666; padding: 20px;">No saved accounts</div>';
      return;
    }

    accountsList.innerHTML = accounts
      .map(
        (account, index) => `
            <div class="zlib-account-item ${
              index === currentAccountIndex ? "active" : ""
            }" data-index="${index}">
                <div class="zlib-account-alias">${
                  account.alias || "Unnamed Account"
                }</div>
                <div class="zlib-account-email">${account.email}</div>
                <div class="zlib-account-actions">
                    <button class="zlib-btn zlib-btn-primary" data-index="${index}" data-action="switch">Switch</button>
                    <button class="zlib-btn" data-index="${index}" data-action="edit">Edit</button>
                    <button class="zlib-btn zlib-btn-danger" data-index="${index}" data-action="delete">Delete</button>
                </div>
            </div>
        `
      )
      .join("");

    // Add account action event listeners
    accountsList.querySelectorAll(".zlib-btn").forEach((btn) => {
      btn.addEventListener("click", handleAccountAction);
    });

    // Add click event listener for entire account item (for switching accounts)
    accountsList.querySelectorAll(".zlib-account-item").forEach((item) => {
      item.addEventListener("click", (event) => {
        // Prevent switching when clicking action buttons
        if (event.target.closest(".zlib-btn")) return;

        const index = parseInt(item.getAttribute("data-index"));
        switchAccount(index);
      });
    });
  };

  // Handle account actions
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

  // Switch account
  const switchAccount = async (index) => {
    if (index < 0 || index >= accounts.length) return;

    const account = accounts[index];

    const currentDomain = window.location.origin;

    try {
      const response = await fetch(`${currentDomain}/rpc.php`, {
        headers: {
          Referer: `${currentDomain}/`,
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
        const data = await response.json();

        // Check if login was successful
        if (data.response && data.response.user_id) {
          currentAccountIndex = index;
          GM_setValue("zlib_current_account", currentAccountIndex);

          // Update interface
          renderAccountsList();

          // Show success message
          showMessage(
            `Switched to account: ${account.alias || account.email}`,
            "success"
          );

          // Refresh page after 2 seconds
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        } else {
          // Login failed - show error message
          const errorMsg =
            data.response && data.response.message
              ? data.response.message
              : "Login failed";
          throw new Error(errorMsg);
        }
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      showMessage(`Login failed: ${error.message}`, "error");
    }
  };

  // Show account form (add or edit)
  const showAccountForm = (index = -1) => {
    const isEdit = index >= 0;
    const account = isEdit
      ? accounts[index]
      : { alias: "", email: "", password: "" };

    const manager = document.getElementById("zlib-account-manager");
    manager.innerHTML = `
            <div class="zlib-manager-header">
                <div class="zlib-manager-title">${
                  isEdit ? "Edit Account" : "Add Account"
                }</div>
            </div>
            <form id="zlib-account-form">
                <div class="zlib-form-group">
                    <label>Alias (optional):</label>
                    <input type="text" class="zlib-form-input" id="zlib-alias"
                           value="${
                             account.alias
                           }" placeholder="Give the account a name">
                </div>
                <div class="zlib-form-group">
                    <label>Email:</label>
                    <input type="email" class="zlib-form-input" id="zlib-email"
                           value="${account.email}" required>
                </div>
                <div class="zlib-form-group">
                    <label>Password:</label>
                    <input type="password" class="zlib-form-input" id="zlib-password"
                           value="${account.password}" required>
                </div>
                <div style="margin-top: 15px;">
                    <button type="button" class="zlib-btn" id="zlib-cancel-form">Cancel</button>
                    <button type="submit" class="zlib-btn zlib-btn-primary">${
                      isEdit ? "Update" : "Save"
                    }</button>
                    <button type="button" class="zlib-btn zlib-btn-success" id="zlib-test-login">Test Login</button>
                </div>
            </form>
        `;
    // ${
    //   isEdit
    //     ? `<button type="button" class="zlib-btn zlib-btn-success" id="zlib-test-login">Test Login</button>`
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

    // if (isEdit) {
    document.getElementById("zlib-test-login").addEventListener("click", () => {
      testLogin(index, isEdit);
    });
    // }
  };

  // Save account
  const saveAccount = (index = -1) => {
    const alias = document.getElementById("zlib-alias").value.trim();
    const email = document.getElementById("zlib-email").value.trim();
    const password = document.getElementById("zlib-password").value;

    if (!email || !password) {
      showMessage("Email and password cannot be empty", "error");
      return;
    }

    const accountData = { alias, email, password };

    if (index >= 0) {
      // Edit existing account
      accounts[index] = accountData;
    } else {
      // Add new account
      accounts.push(accountData);
    }

    GM_setValue("zlib_accounts", JSON.stringify(accounts));
    showMessage(
      `Account ${index >= 0 ? "updated" : "saved"} successfully`,
      "success"
    );

    // Return to account list
    setTimeout(renderAccountManager, 1000);
  };

  // Delete account
  const deleteAccount = (index) => {
    if (!confirm("Are you sure you want to delete this account?")) return;

    accounts.splice(index, 1);

    // If deleting the current account, update current account index
    if (currentAccountIndex === index) {
      currentAccountIndex = -1;
      GM_setValue("zlib_current_account", -1);
    } else if (currentAccountIndex > index) {
      currentAccountIndex--;
      GM_setValue("zlib_current_account", currentAccountIndex);
    }

    GM_setValue("zlib_accounts", JSON.stringify(accounts));
    renderAccountsList();
    showMessage("Account deleted successfully", "success");
  };

  // Test login
  const testLogin = async (index, isEdit) => {
    // Get current domain
    const currentDomain = window.location.origin;

    // Get email and password values
    let email, password;
    if (isEdit) {
      const account = accounts[index];
      email = account.email;
      password = account.password;
    } else {
      email = document.getElementById("zlib-email").value;
      password = document.getElementById("zlib-password").value;
    }

    try {
      const response = await fetch(`${currentDomain}/rpc.php`, {
        headers: {
          Referer: `${currentDomain}/`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `isModal=true&email=${encodeURIComponent(
          email
        )}&password=${encodeURIComponent(
          password
        )}&site_mode=books&action=login&redirectUrl=https%3A%2F%2Fja.z-library.sk%2F&gg_json_mode=1`,
        method: "POST",
      });

      if (response.ok) {
        const data = await response.json();

        // Check if login was successful
        if (data.response && data.response.user_id) {
          showMessage("Login test successful!", "success");
        } else {
          // Login failed - show error message
          const errorMsg =
            data.response && data.response.message
              ? data.response.message
              : "Login Test failed";
          throw new Error(errorMsg);
        }
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      showMessage(`Login test failed: ${error.message}`, "error");
    }
  };

  // Show message
  const showMessage = (message, type = "info") => {
    // Remove existing message
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

    // Trigger entrance animation
    setTimeout(() => {
      msg.style.opacity = "1";
      msg.style.transform = "translateX(0)";
    }, 10);

    // Auto disappear animation after 3 seconds
    setTimeout(() => {
      msg.style.opacity = "0";
      msg.style.transform = "translateX(100%)";
      setTimeout(() => msg.remove(), 300);
    }, 3000);
  };

  // Initialize
  const init = () => {
    createFloatingButton();
    createAccountManager();

    // If current account is saved, automatically show current account info
    if (currentAccountIndex >= 0 && currentAccountIndex < accounts.length) {
      const currentAccount = accounts[currentAccountIndex];
      showMessage(
        `Current account: ${currentAccount.alias || currentAccount.email}`,
        "info"
      );
    }
  };

  // Initialize after page load
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
