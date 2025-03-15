def admin_extras(request):
    """
    Add extra context for admin views to address duplication issues.
    """
    if not request.path.startswith('/admin/'):
        return {}
    
    ctx = {
        'is_permissions_page': '/admin/FlowTestApp/permission/' in request.path,
        'is_roles_page': '/admin/FlowTestApp/role/' in request.path,
        'is_users_page': '/admin/FlowTestApp/customuser/' in request.path,
    }
    
    return ctx