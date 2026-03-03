// Wait until DOM is fully loaded before executing script
document.addEventListener("DOMContentLoaded", function () {

        // Get required DOM elements
        const faqButtons = document.querySelectorAll(".faq-toggle");

        // --------------------------------------------------
        // FAQ Toggle Logic
        // --------------------------------------------------
        faqButtons.forEach((button) => {
            button.addEventListener("click", function () {
                const content = this.nextElementSibling;
                const isOpen = content.classList.toggle("hidden");
                
                this.setAttribute("aria-expanded", !isOpen);
                
                const icon = this.querySelector(".faq-icon");
                icon.textContent = isOpen ? "+" : "-";
            });
        });

});