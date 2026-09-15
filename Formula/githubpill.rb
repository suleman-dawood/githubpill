# Homebrew formula for the githubpill CLI.
#
# Users install it from this repository as a tap:
#   brew tap suleman-dawood/githubpill https://github.com/suleman-dawood/githubpill
#   brew install githubpill
#
# After `npm publish`, refresh `url` and `sha256`:
#   curl -sL https://registry.npmjs.org/githubpill/-/githubpill-<version>.tgz | shasum -a 256
class Githubpill < Formula
  desc "Prior-art reconnaissance for project ideas"
  homepage "https://github.com/suleman-dawood/githubpill"
  url "https://registry.npmjs.org/githubpill/-/githubpill-1.0.0.tgz"
  sha256 "0000000000000000000000000000000000000000000000000000000000000000"
  license "MIT"

  depends_on "node"

  def install
    system "npm", "install", *std_npm_args
    bin.install_symlink libexec.glob("bin/*")
  end

  test do
    assert_match "prior-art reconnaissance", shell_output("#{bin}/githubpill --help")
  end
end
