# Homebrew formula for the githubpill CLI.
#
# Users install it from this repository as a tap:
#   brew tap suleman-dawood/githubpill https://github.com/suleman-dawood/githubpill
#   brew install githubpill
#
# The sha256 below is for the 1.0.0 npm tarball. On each release, refresh it:
#   curl -sL https://registry.npmjs.org/githubpill/-/githubpill-<version>.tgz | shasum -a 256
class Githubpill < Formula
  desc "Prior-art reconnaissance for project ideas"
  homepage "https://github.com/suleman-dawood/githubpill"
  url "https://registry.npmjs.org/githubpill/-/githubpill-1.0.0.tgz"
  sha256 "a46277f8848d221e21fccedb3a8cbb865caf438a7ff3d7392c2454ea176b4578"
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
