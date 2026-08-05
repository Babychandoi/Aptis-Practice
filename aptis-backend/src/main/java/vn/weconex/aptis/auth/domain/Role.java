package vn.weconex.aptis.auth.domain;

import java.util.HashSet;
import java.util.Set;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import vn.weconex.aptis.common.util.BaseEntity;

@Entity
@Table(name = "roles")
@Getter
@Setter
@NoArgsConstructor
public class Role extends BaseEntity {

    public static final String STUDENT = "STUDENT";
    public static final String CONTENT_EDITOR = "CONTENT_EDITOR";
    public static final String CONTENT_REVIEWER = "CONTENT_REVIEWER";
    public static final String TEACHER = "TEACHER";
    public static final String SUPPORT = "SUPPORT";
    public static final String FINANCE = "FINANCE";
    public static final String ADMIN = "ADMIN";
    public static final String SUPER_ADMIN = "SUPER_ADMIN";

    @Column(name = "code", nullable = false, length = 50)
    private String code;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Column(name = "description", length = 500)
    private String description;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "role_permissions",
            joinColumns = @JoinColumn(name = "role_id", columnDefinition = "CHAR(36)"),
            inverseJoinColumns = @JoinColumn(name = "permission_id", columnDefinition = "CHAR(36)"))
    private Set<Permission> permissions = new HashSet<>();
}
