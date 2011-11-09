;
(function($, ns) {
    ns.DashboardPage = chorus.pages.Base.extend({
        crumbs : [
            { label: "Home" }
        ],

        setup : function(){
            this.mainContent = new Backbone.View();
            this.sidebar = new chorus.views.StaticTemplate("dashboard_sidebar");
        }
    });
})(jQuery, chorus.pages);